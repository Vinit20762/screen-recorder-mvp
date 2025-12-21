import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const key = `videos/${id}.webm`;

  await s3.send(
    new PutObjectCommand({
      Bucket: "marvedge-recorder-mvp",
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: "video/webm",
    })
  );

  const url = `https://marvedge-recorder-mvp.s3.eu-north-1.amazonaws.com/${key}`;

  return NextResponse.json({ id, url });
}
