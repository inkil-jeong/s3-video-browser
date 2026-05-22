import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const VIDEO_EXTS = new Set(["mp4","mov","mxf","webm","avi","mkv","m4v","wmv","flv","ts","m2ts"]);
const IMAGE_EXTS = new Set(["jpg","jpeg","png","gif","webp","bmp","tiff","tif","heic","heif","svg","avif"]);
const ALLOWED_EXTS = new Set([...VIDEO_EXTS, ...IMAGE_EXTS]);

// ── 메모리 캐시 (Vercel 인스턴스 수명 동안 유지, 최대 5분) ──
let cache = { bucket: null, prefix: null, files: [], fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

async function fetchAllFiles(bucket, prefix) {
  const now = Date.now();
  if (
    cache.bucket === bucket &&
    cache.prefix === prefix &&
    now - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return { files: cache.files, cached: true };
  }

  const files = [];
  let continuationToken;
  let pageCount = 0;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket:            bucket,
      Prefix:            prefix || undefined,
      MaxKeys:           1000,
      ContinuationToken: continuationToken,
    });
    const res = await s3.send(cmd);
    pageCount++;

    for (const obj of res.Contents || []) {
      const ext = obj.Key.split(".").pop().toLowerCase();
      if (!VIDEO_EXTS.has(ext)) continue;
      // 폴더처럼 보이는 0바이트 항목 제외
      if (obj.Size === 0 && obj.Key.endsWith("/")) continue;

      files.push({
        key:          obj.Key,
        size:         obj.Size,
        lastModified: obj.LastModified,
        storageClass: obj.StorageClass || "STANDARD",
        etag:         obj.ETag?.replace(/"/g, ""),
      });
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  // 캐시 저장
  cache = { bucket, prefix: prefix || "", files, fetchedAt: Date.now() };

  return { files, cached: false, pageCount };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const bucket   = process.env.S3_BUCKET_NAME;
  const prefix   = req.query.prefix   || "";
  const page     = Math.max(1, parseInt(req.query.page)     || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 50));
  const sortBy   = req.query.sortBy   || "date";   // date | size | name
  const sortDir  = req.query.sortDir  || "desc";   // asc | desc
  const search   = req.query.search   || "";
  const extFilter= req.query.ext      || "";
  const fileType = req.query.fileType  || ""; // "video" | "image" | ""

  if (!bucket) {
    return res.status(500).json({ error: "S3_BUCKET_NAME 환경변수가 설정되지 않았습니다." });
  }

  try {
    const { files, cached, pageCount } = await fetchAllFiles(bucket, prefix);

    // ── 필터 ──
    let result = files;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f => f.key.toLowerCase().includes(q));
    }

    if (extFilter) {
      result = result.filter(f => f.key.split(".").pop().toLowerCase() === extFilter);
    }
    if (fileType) {
      result = result.filter(f => f.fileType === fileType);
    }

    // ── 정렬 ──
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = new Date(a.lastModified) - new Date(b.lastModified);
      if (sortBy === "size") cmp = a.size - b.size;
      if (sortBy === "name") cmp = a.key.localeCompare(b.key);
      return sortDir === "desc" ? -cmp : cmp;
    });

    const totalCount = result.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start      = (page - 1) * pageSize;
    const pageFiles  = result.slice(start, start + pageSize);

    return res.status(200).json({
      bucket,
      prefix,
      // 페이지 정보
      page,
      pageSize,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      // 정렬 정보
      sortBy,
      sortDir,
      // 파일 목록
      files: pageFiles,
      // 디버그
      cached,
      s3Pages: pageCount,
    });

  } catch (err) {
    console.error("S3 list error:", err);
    return res.status(500).json({ error: err.message, code: err.Code || err.name });
  }
}
