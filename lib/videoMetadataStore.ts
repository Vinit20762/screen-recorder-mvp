import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "videos.json");

export type VideoMetadata = {
  id: string;
  createdAt: string;
  fileName: string;
  size?: number;
};

export function getAllVideos(): VideoMetadata[] {
  if (!fs.existsSync(FILE)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    let videos: VideoMetadata[];
    
    if (Array.isArray(data)) {
      videos = data;
    } else if (typeof data === 'object' && data !== null) {
      videos = Object.values(data) as VideoMetadata[];
    } else {
      videos = [];
    }
    
    // Sort by creation date, newest first
    return videos.sort((a: VideoMetadata, b: VideoMetadata) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error reading videos metadata:", error);
    return [];
  }
}

export function addVideo(metadata: VideoMetadata) {
  const videos = getAllVideos();
  
  // Check if video already exists
  if (!videos.find(v => v.id === metadata.id)) {
    videos.push(metadata);
    // Sort by creation date, newest first
    videos.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    fs.writeFileSync(FILE, JSON.stringify(videos, null, 2));
  }
}

export function getVideo(id: string): VideoMetadata | null {
  const videos = getAllVideos();
  return videos.find(v => v.id === id) || null;
}

export function deleteVideo(id: string) {
  const videos = getAllVideos();
  const filtered = videos.filter(v => v.id !== id);
  fs.writeFileSync(FILE, JSON.stringify(filtered, null, 2));
}

