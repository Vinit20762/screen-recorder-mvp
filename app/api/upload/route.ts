import { NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { addVideo } from "@/lib/videoMetadataStore";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!BUCKET_NAME) {
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      );
    }

    const id = crypto.randomUUID();
    const key = `videos/${id}.webm`;

    // Upload file to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: "video/webm",
      })
    );

    // Generate a pre-signed URL (valid for 7 days)
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, getObjectCommand, {
      expiresIn: 604800, // 7 days in seconds
    });

    // Save video metadata
    addVideo({
      id,
      createdAt: new Date().toISOString(),
      fileName: file.name || "recording.webm",
      size: file.size,
    });

    return NextResponse.json({
      id,
      url: signedUrl,
    });
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}
