import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [candidateFile] = process.argv.slice(2);
if (!candidateFile) {
  throw new Error("Usage: node resolve-development-baseline.mjs <successful-development-build-commits-file>");
}

const runGit = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const fail = (message) => {
  console.error(`EAS Update blocked: ${message}`);
  process.exit(1);
};
const head = runGit(["rev-parse", "HEAD"]);
const candidates = [...new Set(readFileSync(candidateFile, "utf8").split("\n").map((sha) => sha.trim()).filter(Boolean))];

if (candidates.length === 0) {
  fail("No successful Mobile Development Build provenance is available. Create a Development Build first.");
}

for (const candidate of candidates) {
  try {
    const baseline = runGit(["rev-parse", "--verify", `${candidate}^{commit}`]);
    if (baseline === head) continue;
    execFileSync("git", ["merge-base", "--is-ancestor", baseline, head]);
    process.stdout.write(baseline);
    process.exit(0);
  } catch {
    // A successful build from another branch is not a compatible provenance baseline.
  }
}

fail("No successful Mobile Development Build commit is an ancestor of this source. Create a Development Build from the compatible native source first.");