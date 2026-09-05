import { access } from "node:fs/promises";
import path from "node:path";

import { ZodError } from "zod";

import { loadIssueFiles } from "../../lib/content/load-files";
import { loadSourceCatalog } from "../../lib/content/source-catalog";
import { validateContentCollection } from "../../lib/content/validation";

async function main() {
  try {
    const [files, sources] = await Promise.all([
      loadIssueFiles(),
      loadSourceCatalog(),
    ]);
    console.log(`Validated ${files.length} issue file(s):`);
    files.forEach(({ fileName, issue }) => {
      console.log(`- ${fileName}: ${issue.status}`);
    });
    console.log(`Validated ${sources.length} source catalog entries.`);

    const collectionErrors = validateContentCollection(files, sources);
    const assetErrors = await validateHeroAssets(files);
    if (collectionErrors.length > 0 || assetErrors.length > 0) {
      console.error("Content collection validation failed:");
      collectionErrors.forEach((error) => {
        console.error(`- ${error.path}: ${error.message}`);
      });
      assetErrors.forEach((error) => {
        console.error(`- ${error}`);
      });
      process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Content validation failed:");
      error.issues.forEach((issue) => {
        console.error(`- ${issue.path.join(".") || "root"}: ${issue.message}`);
      });
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

async function validateHeroAssets(
  files: Awaited<ReturnType<typeof loadIssueFiles>>,
) {
  const errors: string[] = [];

  await Promise.all(
    files.map(async ({ fileName, issue }) => {
      const visual = issue.hero?.visual;
      if (!visual) {
        return;
      }

      const assetPath = path.join(
        process.cwd(),
        "public",
        visual.src.replace(/^\/+/, ""),
      );

      try {
        await access(assetPath);
      } catch {
        errors.push(
          `${fileName}.hero.visual.src: Missing project asset ${visual.src}`,
        );
      }
    }),
  );

  return errors;
}

void main();
