import { S3Client, RestoreObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function restoreObject(bucket, key, withDays) {
  const restoreRequest = withDays
    ? { Days: 7, GlacierJobParameters: { Tier: "Standard" } }
    : {};   // INTELLIGENT_TIERING: Days 없이 빈 객체

  return s3.send(new RestoreObjectCommand({
    Bucket:         bucket,
    Key:            key,
    RestoreRequest: restoreRequest,
  }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { key } = req.query;
  const bucket  = process.env.S3_BUCKET_NAME;

  if (!key)    return res.status(400).json({ error: "key 파라미터가 필요합니다." });
  if (!bucket) return res.status(500).json({ error: "S3_BUCKET_NAME 환경변수가 설정되지 않았습니다." });

  try {
    // 1차 시도: Days 없이 (INTELLIGENT_TIERING 방식)
    await restoreObject(bucket, key, false);

    return res.status(200).json({
      success:  true,
      message:  "복원 요청 완료",
      estimate: "3~5시간",
      key,
    });

  } catch (firstErr) {

    const code = firstErr.Code || firstErr.name || "";

    // 이미 진행 중
    if (code === "RestoreAlreadyInProgress") {
      return res.status(200).json({
        success:           true,
        message:           "이미 복원이 진행 중입니다.",
        estimate:          "3~5시간",
        alreadyInProgress: true,
        key,
      });
    }

    // Days가 필요한 경우(Glacier 등) → Days 포함해서 재시도
    if (firstErr.message?.includes("Do not specify Days") === false) {
      try {
        await restoreObject(bucket, key, true);
        return res.status(200).json({
          success:  true,
          message:  "복원 요청 완료 (Glacier)",
          estimate: "3~5시간",
          key,
        });
      } catch (secondErr) {
        const code2 = secondErr.Code || secondErr.name || "";
        if (code2 === "RestoreAlreadyInProgress") {
          return res.status(200).json({
            success: true, message: "이미 복원이 진행 중입니다.",
            estimate: "3~5시간", alreadyInProgress: true, key,
          });
        }
        return res.status(500).json({ error: secondErr.message, code: code2 });
      }
    }

    return res.status(500).json({ error: firstErr.message, code });
  }
}
