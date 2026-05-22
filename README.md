# 🎬 S3 Video Browser

AWS S3에 저장된 동영상 파일을 탐색하고 미리보기할 수 있는 웹 인터페이스입니다.

## 필수 환경변수 (Vercel에 등록)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `AWS_ACCESS_KEY_ID` | IAM Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM Secret Key | `wJal...` |
| `AWS_REGION` | S3 버킷 리전 | `ap-northeast-2` |
| `S3_BUCKET_NAME` | 버킷 이름 | `my-video-bucket` |
| `VITE_BUCKET_NAME` | 사이드바에 표시될 버킷명 | `my-video-bucket` |

## API 엔드포인트

- `GET /api/list?prefix=&maxKeys=1000` — S3 파일 목록
- `GET /api/presign?key=path/to/file.mp4` — Presigned URL 생성 (1시간 유효)

## 로컬 개발

```bash
npm install

# .env.local 파일 생성
cat > .env.local << 'ENV'
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=your-bucket
VITE_BUCKET_NAME=your-bucket
ENV

npm run dev
```

## IAM 최소 권한 정책

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::your-bucket"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```
