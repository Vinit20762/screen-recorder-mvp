import { NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, BUCKET_NAME } from "@/lib/s3";
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

    // Get S3 client (lazy initialization)
    let s3;
    try {
      s3 = getS3Client();
    } catch (s3Error) {
      return NextResponse.json(
        { error: `S3 configuration error: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Upload file to S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: "video/webm",
        })
      );
    } catch (uploadError) {
      return NextResponse.json(
        { error: `S3 upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Generate a pre-signed URL (valid for 7 days)
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    let signedUrl;
    try {
      signedUrl = await getSignedUrl(s3, getObjectCommand, {
        expiresIn: 604800, // 7 days in seconds
      });
    } catch (urlError) {
      return NextResponse.json(
        { error: `URL generation failed: ${urlError instanceof Error ? urlError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Save video metadata
    try {
      addVideo({
        id,
        createdAt: new Date().toISOString(),
        fileName: file.name || "recording.webm",
        size: file.size,
      });
    } catch (metadataError) {
      // Don't fail the request if metadata save fails
    }

    return NextResponse.json({
      id,
      url: signedUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to upload video",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
