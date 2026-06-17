import { loadIssueFiles } from "../../lib/content/load-files";

const timeoutMs = 10_000;
const userAgent =
  "AI-Outpost-Link-Check/1.0 (+https://github.com/ai-outpost)";

type LinkCheckResult = {
  fileName: string;
  sourceId: string;
  title: string;
  url: string;
  status: "ok" | "hard_fail" | "uncertain";
  detail: string;
};

async function main() {
  const files = await loadIssueFiles();
  const checks = files.flatMap(({ fileName, issue }) =>
    issue.sources.map((source) => ({
      fileName,
      sourceId: source.id,
      title: source.title,
      url: source.url,
    })),
  );

  const results = await Promise.all(
    checks.map((check) => checkSourceLink(check)),
  );
  const hardFailures = results.filter((result) => result.status === "hard_fail");
  const uncertainResults = results.filter(
    (result) => result.status === "uncertain",
  );

  console.log(`Checked ${results.length} source link(s).`);
  results
    .filter((result) => result.status === "ok")
    .forEach((result) => {
      console.log(`- OK ${result.fileName}:${result.sourceId} ${result.url}`);
    });

  if (uncertainResults.length > 0) {
    console.warn("Link check warnings:");
    uncertainResults.forEach((result) => {
      console.warn(
        `- WARN ${result.fileName}:${result.sourceId} ${result.url} (${result.detail})`,
      );
    });
  }

  if (hardFailures.length > 0) {
    console.error("Link live-check failed:");
    hardFailures.forEach((result) => {
      console.error(
        `- FAIL ${result.fileName}:${result.sourceId} ${result.url} (${result.detail})`,
      );
    });
    process.exitCode = 1;
  }
}

async function checkSourceLink(input: {
  fileName: string;
  sourceId: string;
  title: string;
  url: string;
}): Promise<LinkCheckResult> {
  const headResult = await requestUrl(input.url, "HEAD");

  if (headResult.kind === "status" && isHealthyStatus(headResult.status)) {
    return {
      ...input,
      status: "ok",
      detail: `HEAD ${headResult.status}`,
    };
  }

  const getResults = [
    await requestUrl(input.url, "GET"),
    await requestUrl(input.url, "GET"),
  ];
  const healthyGet = getResults.find(
    (result) => result.kind === "status" && isHealthyStatus(result.status),
  );

  if (healthyGet?.kind === "status") {
    return {
      ...input,
      status: "ok",
      detail: `GET ${healthyGet.status}`,
    };
  }

  const hardFailure = [headResult, ...getResults].find(
    (result) => result.kind === "status" && isHardFailureStatus(result.status),
  );

  if (hardFailure?.kind === "status") {
    return {
      ...input,
      status: "hard_fail",
      detail: `${hardFailure.method} ${hardFailure.status}`,
    };
  }

  const lastResult = getResults.at(-1) ?? headResult;
  return {
    ...input,
    status: "uncertain",
    detail:
      lastResult.kind === "status"
        ? `${lastResult.method} ${lastResult.status}`
        : `${lastResult.method} ${lastResult.error}`,
  };
}

async function requestUrl(url: string, method: "GET" | "HEAD") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": userAgent,
        ...(method === "GET" ? { range: "bytes=0-0" } : {}),
      },
      method,
      redirect: "follow",
      signal: controller.signal,
    });

    await response.body?.cancel();

    return {
      kind: "status" as const,
      method,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      kind: "error" as const,
      method,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isHealthyStatus(status: number) {
  return status >= 200 && status < 400;
}

function isHardFailureStatus(status: number) {
  return status === 404 || status >= 500;
}

void main();
