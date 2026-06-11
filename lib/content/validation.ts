import type { Issue } from "./schema";
import type { SourceCatalogEntry } from "./source-catalog";

export type ContentValidationError = {
  path: string;
  message: string;
};

export function validateContentCollection(
  issues: Array<{ fileName: string; issue: Issue }>,
  catalog: SourceCatalogEntry[],
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));

  addDuplicateCollectionErrors(
    issues,
    (entry) => entry.issue.id,
    "id",
    errors,
  );
  addDuplicateCollectionErrors(
    issues,
    (entry) => entry.issue.slug,
    "slug",
    errors,
  );
  addDuplicateCollectionErrors(
    issues,
    (entry) => String(entry.issue.issueNumber),
    "issueNumber",
    errors,
  );

  issues.forEach(({ fileName, issue }) => {
    issue.sources.forEach((source, sourceIndex) => {
      const catalogEntry = catalogById.get(source.catalogId);
      const path = `${fileName}.sources.${sourceIndex}`;

      if (!catalogEntry) {
        errors.push({
          path: `${path}.catalogId`,
          message: `Unknown source catalog id: ${source.catalogId}`,
        });
        return;
      }

      if (
        !catalogEntry.officialUrls.some((officialUrl) =>
          source.url.startsWith(officialUrl),
        )
      ) {
        errors.push({
          path: `${path}.url`,
          message: `URL is outside the official allowlist for ${source.catalogId}`,
        });
      }
    });
  });

  return errors;
}

function addDuplicateCollectionErrors(
  issues: Array<{ fileName: string; issue: Issue }>,
  readValue: (entry: { fileName: string; issue: Issue }) => string,
  field: "id" | "slug" | "issueNumber",
  errors: ContentValidationError[],
) {
  const firstFileByValue = new Map<string, string>();

  issues.forEach((entry) => {
    const value = readValue(entry);
    const firstFile = firstFileByValue.get(value);
    if (firstFile) {
      errors.push({
        path: `${entry.fileName}.${field}`,
        message: `Duplicate issue ${field} "${value}" also used by ${firstFile}`,
      });
    } else {
      firstFileByValue.set(value, entry.fileName);
    }
  });
}
