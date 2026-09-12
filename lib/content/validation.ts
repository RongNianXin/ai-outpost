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

const formulaicStylePhrases = [
  "此外",
  "至关重要",
  "深入探讨",
  "这不仅仅是",
  "标志着一个",
  "不断演变的格局",
  "值得注意的是",
  "赋能千行百业",
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

      const isReview = ["independent_review", "creator_review"].includes(source.sourceType);
      const allowedUrls = isReview ? catalogEntry.reviewUrls : catalogEntry.officialUrls;
      if (!allowedUrls.some((allowedUrl) => isWithinSourceUrl(source.url, allowedUrl))) {
        errors.push({
          path: `${path}.url`,
          message: `URL is outside the ${isReview ? "review" : "official"} allowlist for ${source.catalogId}`,
        });
      }
    });

    addVaguePhraseErrors(fileName, issue, errors);
    addFormulaicStyleErrors(fileName, issue, errors);
    addSourceIndexOrderErrors(fileName, issue, errors);
  });

  return errors;
}

/**
 * Enforce the public issue-number/file-name contract at the filesystem boundary.
 * A rehearsal without a formal number uses a date/topic draft name; a numbered
 * draft is reserved as issue-NNN-draft and must not occupy issue-NNN.json.
 */
export function validateIssueFileNames(
  issues: Array<{ fileName: string; issue: Issue }>,
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  for (const { fileName, issue } of issues) {
    const stem = fileName.replace(/\.json$/i, "");
    if (stem !== issue.id) {
      errors.push({
        path: `${fileName}.id`,
        message: `File name stem must match issue id: expected ${stem}, got ${issue.id}`,
      });
    }

    if (issue.issueNumber > 0) {
      const issueStem = `issue-${String(issue.issueNumber).padStart(3, "0")}`;
      const expectedStem = issue.status === "draft" ? `${issueStem}-draft` : issueStem;
      if (stem !== expectedStem) {
        errors.push({
          path: fileName,
          message: `Numbered issue file must be ${expectedStem}.json; drafts must not occupy ${issueStem}.json`,
        });
      }
    } else if (issue.status !== "draft") {
      errors.push({
        path: `${fileName}.status`,
        message: "An issue with issueNumber 0 must remain a draft.",
      });
    } else if (stem.startsWith("issue-")) {
      errors.push({
        path: fileName,
        message: "An unnumbered draft must use draft-<date>-<topic>.json, not issue-NNN.json.",
      });
    }
  }

  return errors;
}

function isWithinSourceUrl(value: string, allowed: string) {
  const url = new URL(value);
  const base = new URL(allowed);
  const basePath = base.pathname.replace(/\/$/, "");
  return url.origin === base.origin && !url.username && !url.password &&
    (url.pathname === base.pathname || url.pathname === basePath || url.pathname.startsWith(basePath + "/"));
}

function addFormulaicStyleErrors(
  fileName: string,
  issue: Issue,
  errors: ContentValidationError[],
) {
  const fields = [
    { path: `${fileName}.title`, value: issue.title },
    { path: `${fileName}.summary`, value: issue.summary },
    ...(issue.hero
      ? [
          { path: `${fileName}.hero.lead`, value: issue.hero.lead },
          { path: `${fileName}.hero.deck`, value: issue.hero.deck },
        ]
      : []),
    ...issue.cards.flatMap((card, cardIndex) => [
      {
        path: `${fileName}.cards.${cardIndex}.title`,
        value: card.title,
      },
      {
        path: `${fileName}.cards.${cardIndex}.oneLineSummary`,
        value: card.oneLineSummary,
      },
      {
        path: `${fileName}.cards.${cardIndex}.whyItMatters`,
        value: card.whyItMatters,
      },
      {
        path: `${fileName}.cards.${cardIndex}.developerImpact`,
        value: card.developerImpact,
      },
      {
        path: `${fileName}.cards.${cardIndex}.communicationAngle`,
        value: card.communicationAngle,
      },
    ]),
  ];

  fields.forEach(({ path, value }) => {
    const matchedPhrase = formulaicStylePhrases.find((phrase) =>
      value.includes(phrase),
    );

    if (matchedPhrase) {
      errors.push({
        path,
        message: `Formulaic style phrase "${matchedPhrase}" is not allowed. Rewrite with a concrete subject, action or consequence.`,
      });
    }
  });
}

const sourceIndexOrderStatuses = new Set<Issue["status"]>(["draft", "approved"]);

function addSourceIndexOrderErrors(
  fileName: string,
  issue: Issue,
  errors: ContentValidationError[],
) {
  if (!sourceIndexOrderStatuses.has(issue.status)) {
    return;
  }

  const expectedOrder: string[] = [];
  const seenSourceIds = new Set<string>();

  issue.cards.forEach((card) => {
    card.facts.forEach((fact) => {
      fact.sourceIds.forEach((sourceId) => {
        if (seenSourceIds.has(sourceId)) {
          return;
        }
        seenSourceIds.add(sourceId);
        expectedOrder.push(sourceId);
      });
    });
  });

  const actualOrder = issue.sources.map((source) => source.id);
  const length = Math.max(actualOrder.length, expectedOrder.length);
  let mismatchIndex = -1;

  for (let index = 0; index < length; index += 1) {
    if (actualOrder[index] !== expectedOrder[index]) {
      mismatchIndex = index;
      break;
    }
  }

  if (mismatchIndex === -1) {
    return;
  }

  const actual = actualOrder[mismatchIndex];
  const expected = expectedOrder[mismatchIndex];

  if (actual === undefined) {
    errors.push({
      path: `${fileName}.sources`,
      message: `Source index is missing entry ${mismatchIndex + 1} ("${expected}") required by card order.`,
    });
    return;
  }

  if (expected === undefined) {
    errors.push({
      path: `${fileName}.sources.${mismatchIndex}.id`,
      message: `Source "${actual}" is not cited by any card. Attach it to a fact or remove it.`,
    });
    return;
  }

  errors.push({
    path: `${fileName}.sources.${mismatchIndex}.id`,
    message:
      `Source index order must follow card order: entry ${mismatchIndex + 1} should be ` +
      `"${expected}" but is "${actual}". Order sources[] by the first card that cites each source, ` +
      `so the first entry supports the first card.`,
  });
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
