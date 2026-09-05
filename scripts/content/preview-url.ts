import { loadIssueFiles } from "../../lib/content/load-files";
import { buildPreviewUrl, selectPreviewIssue } from "../../lib/content/preview";

async function main() {
  const requestedSlug = readArgument("--slug");
  const baseUrl = readArgument("--base-url");
  const files = await loadIssueFiles();
  const issue = selectPreviewIssue(
    files.map(({ issue: loadedIssue }) => loadedIssue),
    requestedSlug,
  );

  console.log(buildPreviewUrl(issue, baseUrl));
}

function readArgument(name: string) {
  const argumentIndex = process.argv.indexOf(name);
  return argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined;
}

void main();
