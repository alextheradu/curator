import fs from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";

export async function readPublicMarkdown(filename: string): Promise<string> {
  return unstable_cache(
    async () => fs.readFile(path.join(process.cwd(), "public", filename), "utf-8"),
    ["public-markdown", filename],
    {
      revalidate: 3600,
      tags: [`public-markdown:${filename}`],
    },
  )();
}
