import type { Issue } from "./schema";
import type { SourceCatalogEntry } from "./source-catalog";

export type ContentValidationError = {
  path: string;
  message: string;
};

const vagueActionPhrases = [
  "保持关注",
  "建议试用",
  "拭目以待",
  "根据实际情况决定",
  "视情况而定",
  "值得关注",
  "持续观察",
];

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

    addVaguePhraseErrors(fileName, issue, errors);
  });

  return errors;
}

function addVaguePhraseErrors(
  fileName: string,
  issue: Issue,
  errors: ContentValidationError[],
) {
  issue.cards.forEach((card, cardIndex) => {
    checkTextForVaguePhrases(
      `${fileName}.cards.${cardIndex}.oneLineSummary`,
      card.oneLineSummary,
      errors,
    );
  });

  issue.opportunities.forEach((opportunity, opportunityIndex) => {
    checkTextForVaguePhrases(
      `${fileName}.opportunities.${opportunityIndex}.rationale`,
      opportunity.rationale,
      errors,
    );
    checkTextForVaguePhrases(
      `${fileName}.opportunities.${opportunityIndex}.plainLanguage`,
      opportunity.plainLanguage,
      errors,
    );
  });

  checkTextForVaguePhrases(
    `${fileName}.practiceTask.objective`,
    issue.practiceTask.objective,
    errors,
  );

  issue.practiceTask.steps.forEach((step, stepIndex) => {
    checkTextForVaguePhrases(
      `${fileName}.practiceTask.steps.${stepIndex}`,
      step,
      errors,
    );
  });
}

function checkTextForVaguePhrases(
  path: string,
  value: string,
  errors: ContentValidationError[],
) {
  const matchedPhrase = vagueActionPhrases.find((phrase) =>
    value.includes(phrase),
  );

  if (matchedPhrase) {
    errors.push({
      path,
      message: `Vague action phrase "${matchedPhrase}" is not allowed. Use a concrete next action instead.`,
    });
  }
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
