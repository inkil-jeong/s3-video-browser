import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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

  const { key }   = req.query;
  const bucket    = process.env.S3_BUCKET_NAME;
  const expiresIn = parseInt(req.query.expiresIn) || 3600;

  if (!key)    return res.status(400).json({ error: "key 파라미터가 필요합니다." });
  if (!bucket) return res.status(500).json({ error: "S3_BUCKET_NAME 환경변수가 설정되지 않았습니다." });

  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn }
    );
    return res.status(200).json({ url, expiresIn, key });
  } catch (err) {
    console.error("Presign error:", err);
    return res.status(500).json({ error: err.message, code: err.Code || err.name });
  }
}
