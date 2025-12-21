import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "analytics.json");

type Analytics = {
  views: number;
  totalWatchTime: number;
  duration: number;
};

export function readAnalytics(id: string): Analytics {
  if (!fs.existsSync(FILE)) return { views: 0, totalWatchTime: 0, duration: 0 };

  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  return data[id] ?? { views: 0, totalWatchTime: 0, duration: 0 };
}

export function writeAnalytics(id: string, analytics: Analytics) {
  const data = fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE, "utf-8"))
    : {};

  data[id] = analytics;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
