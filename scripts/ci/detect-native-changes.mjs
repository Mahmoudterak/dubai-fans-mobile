import { execFileSync } from "node:child_process";

const [baseRef] = process.argv.slice(2);
if (!baseRef) {
  throw new Error("Usage: node detect-native-changes.mjs <approved-native-baseline-ref>");
}

const runGit = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const fail = (message) => {
  console.error(`EAS Update blocked: ${message}`);
  process.exit(1);
};

let resolvedBase;
try {
  resolvedBase = runGit(["rev-parse", "--verify", `${baseRef}^{commit}`]);
} catch {
  fail(`The approved native baseline ${baseRef} is not available in this checkout.`);
}

const head = runGit(["rev-parse", "HEAD"]);
if (resolvedBase === head) {
  fail("No source delta exists from the native baseline. Dispatch EAS Update from the JavaScript-only change branch, not after it has merged.");
}

try {
  execFileSync("git", ["merge-base", "--is-ancestor", resolvedBase, head]);
} catch {
  fail("The approved native baseline is not an ancestor of this source commit.");
}

const changeRows = runGit([
  "diff",
  "--name-status",
  "--find-renames",
  "--find-copies",
  `${resolvedBase}...${head}`,
])
  .split("\n")
  .filter(Boolean);

const changedFiles = changeRows.flatMap((row) => {
  const [status, ...paths] = row.split("\t");
  if (/^[RC]/.test(status) && paths.length >= 2) return paths.slice(0, 2);
  return paths.slice(0, 1);
});

if (changedFiles.length === 0) fail("No changed files were found from the approved native baseline.");

const nativeSensitive = (file) =>
  file === "app.json" ||
  file.startsWith("app.config.") ||
  file === "eas.json" ||
  file === "package.json" ||
  file === "package-lock.json" ||
  file === "babel.config.js" ||
  file === "metro.config.js" ||
  file.startsWith("android/") ||
  file.startsWith("ios/") ||
  file.startsWith("plugins/") ||
  file === "assets/icon.png" ||
  file === "assets/adaptive-icon.png" ||
  file === "assets/splash-icon.png";

const nativeChanges = changedFiles.filter(nativeSensitive);
if (nativeChanges.length > 0) {
  fail(
    `Native/config/dependency changes were detected since ${resolvedBase}:\n${nativeChanges
      .map((file) => `- ${file}`)
      .join("\n")}\nRun Mobile Development Build instead.`,
  );
}

console.log(`JavaScript-only change set confirmed from ${resolvedBase} to ${head}.`);
console.log(changedFiles.map((file) => `- ${file}`).join("\n"));