import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [inputPath, outputPath, expectedProfile, expectedArtifactExtension] = process.argv.slice(2);
if (!inputPath || !outputPath || !expectedProfile || !expectedArtifactExtension) {
  throw new Error(
    "Usage: node collect-eas-build.mjs <input-json> <output-json> <expected-profile> <expected-artifact-extension>",
  );
}

const payload = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
const build = Array.isArray(payload) ? payload[0] : payload;
const appConfig = JSON.parse(readFileSync(resolve("app.json"), "utf8")).expo;
const fail = (message) => {
  throw new Error(`EAS build verification failed: ${message}`);
};

if (!build || typeof build !== "object") fail("EAS did not return a build JSON object.");
if (build.status !== "FINISHED") fail(`EAS build status is ${build.status ?? "missing"}, not FINISHED.`);
if (String(build.platform).toLowerCase() !== "android") {
  fail(`Expected Android build, received ${build.platform ?? "missing"}.`);
}
if (build.buildProfile !== expectedProfile) {
  fail(`Expected profile ${expectedProfile}, received ${build.buildProfile ?? "missing"}.`);
}

const artifactUrl = build.artifacts?.buildUrl ?? build.artifacts?.applicationArchiveUrl;
const extensionPattern = new RegExp(`\\.${expectedArtifactExtension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\?)`, "i");
if (!artifactUrl || !extensionPattern.test(artifactUrl)) {
  fail(`The EAS result does not expose the expected .${expectedArtifactExtension} artifact URL.`);
}

const configuredRuntime =
  appConfig.runtimeVersion?.policy === "appVersion"
    ? appConfig.version
    : appConfig.runtimeVersion ?? "unknown";

const metadata = {
  buildId: build.id,
  status: build.status,
  platform: build.platform,
  profile: build.buildProfile,
  version: build.appVersion ?? "unknown",
  versionCode: build.appBuildVersion ?? build.androidVersionCode ?? "unknown",
  runtimeVersion: build.runtimeVersion ?? configuredRuntime,
  artifactUrl,
  easRecordedCommit: build.gitCommitHash ?? null,
};

writeFileSync(resolve(outputPath), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));