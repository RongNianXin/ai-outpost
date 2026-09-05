import { spawn } from "node:child_process";

type CommandResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

export function runCommand(
  command: string,
  args: string[],
  options: { timeoutMs?: number; shell?: boolean } = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      windowsHide: true,
      shell: options.shell ?? false,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        resolve({
          ok: false,
          code: null,
          stdout: trimOutput(stdout),
          stderr: `命令在 ${options.timeoutMs ?? 20_000}ms 后超时。`,
        });
      }
    }, options.timeoutMs ?? 20_000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        resolve({
          ok: code === 0,
          code,
          stdout: trimOutput(stdout),
          stderr: trimOutput(stderr),
        });
      }
    });
  });
}

export function commandSummary(result: CommandResult) {
  return result.stderr || result.stdout || `退出码 ${result.code ?? "未知"}`;
}

function trimOutput(value: string) {
  const maxLength = 8_000;
  const trimmed = value.trim();
  return trimmed.length <= maxLength
    ? trimmed
    : `${trimmed.slice(0, maxLength)}\n…输出已截断`;
}
