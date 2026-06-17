import { z } from "zod";

export const issueStatuses = [
  "draft",
  "approved",
  "published",
  "corrected",
] as const;
export const publicIssueStatuses = [
  "published",
  "corrected",
] as const;
export const approvedIssueStatuses = [
  "approved",
  "published",
  "corrected",
] as const;
export const reviewStatuses = [
  "unverified",
  "ai_checked",
  "ai_cross_checked",
] as const;
export const maturityLevels = [
  "experimental",
  "usable",
  "worth_investing",
] as const;
export const noiseRisks = ["low", "medium", "high"] as const;
export const actionTypes = ["ignore", "save", "learn", "try"] as const;
export const reviewRisks = ["low", "medium", "high"] as const;
export const sourceTypes = [
  "official_blog",
  "official_docs",
  "github_release",
  "official_changelog",
  "official_pricing",
  "official_status",
  "official_announcement",
] as const;

const dateSchema = z.iso.date();
const dateTimeSchema = z.iso.datetime({ offset: true });
const idSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const reviewStatusSchema = z.enum(reviewStatuses);

export const evidenceSourceSchema = z.object({
  id: idSchema,
  catalogId: idSchema,
  title: z.string().min(3).max(180),
  url: z.url(),
  sourceType: z.enum(sourceTypes),
  publisher: z.string().min(2).max(100),
  publishedAt: dateSchema.nullable(),
  accessedAt: dateTimeSchema,
  evidenceLocation: z.string().min(2).max(180),
  evidenceExcerpt: z.string().min(5).max(300),
});

export const verifiedFactSchema = z.object({
  id: idSchema,
  claim: z.string().min(5).max(400),
  sourceIds: z.array(idSchema).min(1),
  limitations: z.array(z.string().min(2).max(240)).max(6),
  reviewStatus: reviewStatusSchema,
});

export const intelCardSchema = z.object({
  id: idSchema,
  title: z.string().min(4).max(120),
  category: z.string().min(2).max(40),
  publisher: z.string().min(2).max(100),
  occurredAt: dateSchema,
  discoveredAt: dateSchema,
  oneLineSummary: z.string().min(8).max(220),
  whyItMatters: z.string().min(8).max(800),
  developerImpact: z.string().min(8).max(800),
  maturity: z.enum(maturityLevels),
  noiseRisk: z.enum(noiseRisks),
  suggestedAction: z.enum(actionTypes),
  reviewRisk: z.enum(reviewRisks),
  reviewStatus: reviewStatusSchema,
  communicationAngle: z.string().min(8).max(300),
  visualHint: z.string().max(240).default(""),
  facts: z.array(verifiedFactSchema).min(1).max(8),
  tags: z.array(z.string().min(1).max(30)).max(8),
});

const productOpportunitySchema = z.object({
  id: idSchema,
  title: z.string().min(4).max(100),
  rationale: z.string().min(8).max(600),
  plainLanguage: z.string().min(8).max(240),
  relatedCardIds: z.array(idSchema).min(1).max(6),
  confidence: z.enum(["low", "medium", "high"]),
});

const practiceTaskSchema = z.object({
  title: z.string().min(4).max(100),
  durationMinutes: z.number().int().min(30).max(120),
  objective: z.string().min(8).max(300),
  steps: z.array(z.string().min(4).max(240)).min(1).max(8),
  relatedCardIds: z.array(idSchema).max(6),
});

const correctionSchema = z.object({
  correctedAt: dateTimeSchema,
  description: z.string().min(8).max(500),
  affectedCardIds: z.array(idSchema).max(6),
});

const glossaryEntrySchema = z.object({
  term: z.string().min(1).max(60),
  explanation: z.string().min(4).max(160),
});

export const issueSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    slug: idSchema,
    issueNumber: z.number().int().min(0),
    title: z.string().min(4).max(120),
    summary: z.string().min(8).max(600),
    period: z.object({
      start: dateSchema,
      end: dateSchema,
    }),
    status: z.enum(issueStatuses),
    publishedAt: dateTimeSchema.nullable(),
    topChangeIds: z.array(idSchema).max(3),
    opportunities: z.array(productOpportunitySchema).max(4),
    practiceTask: practiceTaskSchema,
    glossary: z.array(glossaryEntrySchema).max(20).default([]),
    cards: z.array(intelCardSchema).max(6),
    sources: z.array(evidenceSourceSchema).max(30),
    corrections: z.array(correctionSchema).max(20),
    editorial: z.object({
      generatedAt: dateTimeSchema,
      aiReviewCompleted: z.boolean(),
      factCheckCompletedAt: dateTimeSchema.nullable(),
      previewApprovedAt: dateTimeSchema.nullable(),
      publicationApprovedAt: dateTimeSchema.nullable(),
      notes: z.string().max(1000).default(""),
    }),
  })
  .superRefine((issue, context) => {
    if (issue.period.start > issue.period.end) {
      context.addIssue({
        code: "custom",
        path: ["period", "end"],
        message: "Period end must not be earlier than period start.",
      });
    }

    addDuplicateIssues(
      issue.cards.map((card) => card.id),
      ["cards"],
      "card",
      context,
    );
    addDuplicateIssues(
      issue.sources.map((source) => source.id),
      ["sources"],
      "source",
      context,
    );
    addDuplicatePracticeStepIssues(issue.practiceTask.steps, context);

    const cardIds = new Set(issue.cards.map((card) => card.id));
    const sourceIds = new Set(issue.sources.map((source) => source.id));
    const approvedStatus = approvedIssueStatuses.includes(
      issue.status as (typeof approvedIssueStatuses)[number],
    );
    const publicStatus = publicIssueStatuses.includes(
      issue.status as (typeof publicIssueStatuses)[number],
    );

    issue.topChangeIds.forEach((cardId, index) => {
      addMissingReferenceIssue(
        cardIds,
        cardId,
        ["topChangeIds", index],
        "card",
        context,
      );
    });

    issue.cards.forEach((card, cardIndex) => {
      addDuplicateIssues(
        card.facts.map((fact) => fact.id),
        ["cards", cardIndex, "facts"],
        "fact",
        context,
      );

      card.facts.forEach((fact, factIndex) => {
        fact.sourceIds.forEach((sourceId, sourceIndex) => {
          addMissingReferenceIssue(
            sourceIds,
            sourceId,
            [
              "cards",
              cardIndex,
              "facts",
              factIndex,
              "sourceIds",
              sourceIndex,
            ],
            "source",
            context,
          );
        });

        if (approvedStatus && fact.reviewStatus !== "ai_cross_checked") {
        context.addIssue({
          code: "custom",
          path: ["cards", cardIndex, "facts", factIndex, "reviewStatus"],
          message: "Previewed or public issues require AI cross-checked facts.",
        });
        }
      });

      if (approvedStatus && card.reviewStatus !== "ai_cross_checked") {
        context.addIssue({
          code: "custom",
          path: ["cards", cardIndex, "reviewStatus"],
          message: "Previewed or public issues require AI cross-checked cards.",
        });
      }
    });

    issue.opportunities.forEach((opportunity, opportunityIndex) => {
      opportunity.relatedCardIds.forEach((cardId, referenceIndex) => {
        addMissingReferenceIssue(
          cardIds,
          cardId,
          [
            "opportunities",
            opportunityIndex,
            "relatedCardIds",
            referenceIndex,
          ],
          "card",
          context,
        );
      });
    });

    issue.practiceTask.relatedCardIds.forEach((cardId, index) => {
      addMissingReferenceIssue(
        cardIds,
        cardId,
        ["practiceTask", "relatedCardIds", index],
        "card",
        context,
      );
    });

    issue.corrections.forEach((correction, correctionIndex) => {
      correction.affectedCardIds.forEach((cardId, referenceIndex) => {
        addMissingReferenceIssue(
          cardIds,
          cardId,
          [
            "corrections",
            correctionIndex,
            "affectedCardIds",
            referenceIndex,
          ],
          "card",
          context,
        );
      });
    });

    if (approvedStatus) {
      if (!issue.editorial.aiReviewCompleted) {
        context.addIssue({
          code: "custom",
          path: ["editorial", "aiReviewCompleted"],
          message: "Previewed or public issues require completed AI review.",
        });
      }
      if (!issue.editorial.factCheckCompletedAt) {
        context.addIssue({
          code: "custom",
          path: ["editorial", "factCheckCompletedAt"],
          message:
            "Previewed or public issues require a completed fact-check date.",
        });
      }
      if (!issue.editorial.previewApprovedAt) {
        context.addIssue({
          code: "custom",
          path: ["editorial", "previewApprovedAt"],
          message: "Approved issues require automated preview verification.",
        });
      }
    }

    if (publicStatus) {
      if (!issue.publishedAt) {
        context.addIssue({
          code: "custom",
          path: ["publishedAt"],
          message: "Public issues require a publication date.",
        });
      }
    }

    if (issue.status === "corrected" && issue.corrections.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["corrections"],
        message: "Corrected issues require at least one correction record.",
      });
    }
  });

function addDuplicateIssues(
  values: string[],
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: "custom",
        path: [...path, index, "id"],
        message: `Duplicate ${label} id: ${value}`,
      });
    }
    seen.add(value);
  });
}

function addDuplicatePracticeStepIssues(
  steps: string[],
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  steps.forEach((step, index) => {
    const normalizedStep = step.trim();
    if (seen.has(normalizedStep)) {
      context.addIssue({
        code: "custom",
        path: ["practiceTask", "steps", index],
        message: `Duplicate practice step: ${step}`,
      });
    }
    seen.add(normalizedStep);
  });
}

function addMissingReferenceIssue(
  availableIds: Set<string>,
  value: string,
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
) {
  if (!availableIds.has(value)) {
    context.addIssue({
      code: "custom",
      path,
      message: `Unknown ${label} reference: ${value}`,
    });
  }
}

export type Issue = z.infer<typeof issueSchema>;
export type IntelCard = z.infer<typeof intelCardSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type VerifiedFact = z.infer<typeof verifiedFactSchema>;
