import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "analytics.json");

type Analytics = {
  views: number;
  totalWatchTime: number;
  duration: number;
  watchSessions: number[]; // Array of watch completion percentages (0-100)
};

export function readAnalytics(id: string): Analytics {
  if (!fs.existsSync(FILE)) {
    return { views: 0, totalWatchTime: 0, duration: 0, watchSessions: [] };
  }

  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  const existing = data[id] ?? { views: 0, totalWatchTime: 0, duration: 0, watchSessions: [] };
  
  // Ensure watchSessions exists for backward compatibility
  if (!existing.watchSessions) {
    existing.watchSessions = [];
  }
  
  return existing;
}

export function writeAnalytics(id: string, analytics: Analytics) {
  const data = fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE, "utf-8"))
    : {};

  data[id] = analytics;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function incrementView(id: string) {
  const current = readAnalytics(id);
  writeAnalytics(id, {
    ...current,
    views: current.views + 1,
  });
}

export function recordWatchSession(id: string, watched: number, duration: number) {
  const current = readAnalytics(id);
  const completionPercentage = duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0;
  
  writeAnalytics(id, {
    views: current.views, // Preserve view count
    totalWatchTime: current.totalWatchTime + watched,
    duration: duration || current.duration, // Update duration if provided
    watchSessions: [...(current.watchSessions || []), completionPercentage],
  });
}

export function getAverageCompletion(id: string): number {
  const analytics = readAnalytics(id);
  if (!analytics.watchSessions || analytics.watchSessions.length === 0) {
    return 0;
  }
  
  const sum = analytics.watchSessions.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / analytics.watchSessions.length);
}
