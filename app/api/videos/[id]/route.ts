import { NextResponse } from "next/server";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, BUCKET_NAME } from "@/lib/s3";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    if (!BUCKET_NAME) {
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      );
    }

    // Handle both Promise and direct params for compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;
    const key = `videos/${id}.webm`;

    // Get S3 client (lazy initialization)
    const s3 = getS3Client();

    // Check if the object exists first
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );
    } catch (headError: any) {
      if (headError.name === "NotFound" || headError.$metadata?.httpStatusCode === 404) {
        return NextResponse.json(
          { error: "Video not found" },
          { status: 404 }
        );
      }
      // If it's not a 404, continue to try generating the URL anyway
      console.warn("Could not verify video existence:", headError);
    }

    // Generate a pre-signed URL for viewing (valid for 1 hour)
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, getObjectCommand, {
      expiresIn: 3600, // 1 hour in seconds
    });

    // Get the base URL for the video page (for shareable links)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
      'http://localhost:3000';

    const videoPageUrl = `${baseUrl}/videos/${id}`;

    return NextResponse.json({
      url: signedUrl, // Pre-signed S3 URL for direct video access
      shareUrl: videoPageUrl // Shareable link to video page
    });
  } catch (error: any) {
    console.error("Error generating video URL:", error);
    return NextResponse.json(
      {
        error: "Failed to generate video URL",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

