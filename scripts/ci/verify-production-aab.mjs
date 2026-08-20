import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";

const [aabPath, sourceCommitPath, reportPath] = process.argv.slice(2);
if (!aabPath || !sourceCommitPath || !reportPath) {
  throw new Error("Usage: node verify-production-aab.mjs <aab> <source-commit-file> <report-file>");
}

const aab = resolve(aabPath);
const fail = (message) => {
  throw new Error(`Production AAB verification failed: ${message}`);
};
if (!aab.endsWith(".aab") || !existsSync(aab)) fail("Expected a downloaded .aab artifact.");

execFileSync("unzip", ["-t", aab], { stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
const entries = execFileSync("unzip", ["-Z1", aab], { encoding: "utf8" });
const bundleEntry = "base/assets/index.android.bundle";
if (!entries.split("\n").includes(bundleEntry)) {
  fail(`The AAB does not contain ${bundleEntry}.`);
}

const tempDir = mkdtempSync(join(tmpdir(), "dubai-fans-aab-"));
const bundlePath = join(tempDir, "index.android.bundle");

try {
  const bundle = execFileSync("unzip", ["-p", aab, bundleEntry], {
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
  writeFileSync(bundlePath, bundle);

  const hermes = resolve("node_modules/react-native/sdks/hermesc/linux64-bin/hermesc");
  if (!existsSync(hermes)) fail("Hermes bytecode verifier is not present after npm ci.");

  const bytecodeDump = execFileSync(hermes, ["-b", "-dump-bytecode", bundlePath], {
    encoding: "utf8",
    maxBuffer: 60 * 1024 * 1024,
  });
  const requiredMarkers = [
    "https://wa.me/971542861215",
    "info@mtuaefans.com",
    "https://mtuaefans.com",
    "https://www.instagram.com/mtuaefans",
    "https://mtuaefans.com/website-templates",
    "landing-page",
    "erp-crm",
    "custom-development",
    "canOpenURL",
    "openBrowserAsync",
  ];

  for (const marker of requiredMarkers) {
    if (!bytecodeDump.includes(marker)) fail(`Embedded JavaScript bundle is missing: ${marker}`);
  }

  const sourceCommit = readFileSync(resolve(sourceCommitPath), "utf8").trim();
  if (!/^[0-9a-f]{40}$/i.test(sourceCommit)) fail("The recorded source commit is invalid.");

  const report = {
    file: basename(aab),
    sha256: createHash("sha256").update(bundle).digest("hex"),
    sourceCommit,
    bundleEntry,
    verifiedMarkers: requiredMarkers,
  };
  writeFileSync(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}