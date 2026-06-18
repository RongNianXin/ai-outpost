type ParsedArgs = {
  title: string;
  desp: string;
};

const sendKey = process.env.SERVER_CHAN_SENDKEY;

async function main() {
  if (!sendKey) {
    throw new Error(
      "Missing SERVER_CHAN_SENDKEY. Store the ServerChan sendkey in GitHub Actions secrets before running this script.",
    );
  }

  const { title, desp } = parseArgs(process.argv.slice(2));
  const endpoint = `https://sctapi.ftqq.com/${encodeURIComponent(sendKey)}.send`;
  const body = new URLSearchParams({
    title,
    desp,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "AI-Outpost-Weekly-Ops/1.0",
    },
    body,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `ServerChan notification failed with HTTP ${response.status}: ${responseText}`,
    );
  }

  console.log("ServerChan notification request completed.");
}

function parseArgs(args: string[]): ParsedArgs {
  const title = readArg(args, "--title");
  const desp = readArg(args, "--desp");

  if (!title) {
    throw new Error("Missing --title.");
  }

  if (!desp) {
    throw new Error("Missing --desp.");
  }

  return { title, desp };
}

function readArg(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

void main();
