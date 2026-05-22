import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { key, contentType } = req.query;
  const bucket = process.env.S3_BUCKET_NAME;

  if (!key)    return res.status(400).json({ error: "key 파라미터가 필요합니다." });
  if (!bucket) return res.status(500).json({ error: "S3_BUCKET_NAME 환경변수가 설정되지 않았습니다." });

  try {
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket:      bucket,
        Key:         key,
        ContentType: contentType || "application/octet-stream",
      }),
      { expiresIn: 3600 }
    );
    return res.status(200).json({ url, key, bucket });
  } catch (err) {
    console.error("Upload URL error:", err);
    return res.status(500).json({ error: err.message });
  }
}
