import fs from "fs/promises";
import path from "path";

export async function readPublicMarkdown(filename: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "public", filename), "utf-8");
}
