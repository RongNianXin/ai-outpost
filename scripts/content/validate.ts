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
    console.log(`Validated ${sources.length} official source catalog entries.`);

    const collectionErrors = validateContentCollection(files, sources);
    if (collectionErrors.length > 0) {
      console.error("Content collection validation failed:");
      collectionErrors.forEach((error) => {
        console.error(`- ${error.path}: ${error.message}`);
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

void main();
