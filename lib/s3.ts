import { S3Client } from "@aws-sdk/client-s3";

export const AWS_REGION = process.env.AWS_REGION || "eu-north-1";
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Lazy initialization - S3 client only created when actually needed
let s3Instance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Instance) {
    // Validate configuration only when S3 is actually needed
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS credentials are missing. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables in .env.local"
      );
    }
    if (!BUCKET_NAME) {
      throw new Error(
        "AWS_S3_BUCKET_NAME environment variable is not set in .env.local"
      );
    }

    s3Instance = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Instance;
}
