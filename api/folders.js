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

// 전체 파일 목록 캐시 (list.js 와 공유되지 않으므로 독립 캐시)
let cache = { files: [], fetchedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000;

async function fetchAll(bucket) {
  if (Date.now() - cache.fetchedAt < CACHE_TTL && cache.files.length > 0) {
    return cache.files;
  }
  const files = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucket, MaxKeys: 1000, ContinuationToken: token,
    }));
    for (const obj of res.Contents || []) {
      const ext = obj.Key.split(".").pop().toLowerCase();
      if (!ALLOWED_EXTS.has(ext) || obj.Size === 0) continue;
      files.push({ key: obj.Key, lastModified: obj.LastModified });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  cache = { files, fetchedAt: Date.now() };
  return files;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) return res.status(500).json({ error: "S3_BUCKET_NAME 미설정" });

  try {
    const files = await fetchAll(bucket);

    // 폴더별 최신 수정일 집계
    const folderLatest = {};   // fullFolderPath → Date
    const folderTree   = {};   // 트리 구조

    files.forEach(f => {
      const parts = f.key.split("/").slice(0, -1);
      if (parts.length === 0) return;

      // 각 depth의 폴더 경로에 날짜 반영
      parts.forEach((_, i) => {
        const folderPath = parts.slice(0, i + 1).join("/");
        const d = new Date(f.lastModified);
        if (!folderLatest[folderPath] || d > folderLatest[folderPath]) {
          folderLatest[folderPath] = d;
        }
      });

      // 트리 구조 빌드
      let node = folderTree;
      parts.forEach(p => { if (!node[p]) node[p] = {}; node = node[p]; });
    });

    // 최상위 폴더를 최신순으로 정렬
    const topFolders = Object.keys(folderTree).sort((a, b) => {
      const da = folderLatest[a] || new Date(0);
      const db = folderLatest[b] || new Date(0);
      return db - da;
    });

    return res.status(200).json({
      tree:        folderTree,
      topFolders,                        // 최신순 정렬된 최상위 폴더 배열
      folderLatest: Object.fromEntries(  // ISO string으로 변환
        Object.entries(folderLatest).map(([k, v]) => [k, v.toISOString()])
      ),
      totalFiles: files.length,
      bucket,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
