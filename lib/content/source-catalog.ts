import { promises as fs } from "node:fs";
import path from "node:path";

import { z } from "zod";

const sourceCatalogEntrySchema = z.object({
  id: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(100),
  homepage: z.url(),
  officialUrls: z.array(z.url()).min(1).max(12),
  topics: z.array(z.string().min(2).max(40)).min(1).max(12),
});

export const sourceCatalogSchema = z
  .array(sourceCatalogEntrySchema)
  .min(1)
  .max(30)
  .superRefine((entries, context) => {
    const seenIds = new Set<string>();
    entries.forEach((entry, index) => {
      if (seenIds.has(entry.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: `Duplicate source catalog id: ${entry.id}`,
        });
      }
      seenIds.add(entry.id);
    });
  });

export async function loadSourceCatalog() {
  const filePath = path.join(process.cwd(), "content", "sources.json");
  const contents = await fs.readFile(filePath, "utf8");
  return sourceCatalogSchema.parse(JSON.parse(stripBom(contents)));
}

function stripBom(contents: string) {
  return contents.replace(/^\uFEFF/, "");
}

export type SourceCatalogEntry = z.infer<typeof sourceCatalogEntrySchema>;
