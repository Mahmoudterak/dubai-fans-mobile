import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));
const fail = (message) => {
  console.error(`CI contract check failed: ${message}`);
  process.exit(1);
};

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const appConfig = readJson("app.json");
const easConfig = readJson("eas.json");
const rootLockPackage = packageLock.packages?.[""];
const dynamicExpoConfigFiles = ["app.config.js", "app.config.cjs", "app.config.mjs", "app.config.ts"];

if (!rootLockPackage) fail("package-lock.json does not include the root package metadata.");
for (const configFile of dynamicExpoConfigFiles) {
  if (existsSync(resolve(root, configFile))) {
    fail(`${configFile} is a dynamic Expo configuration entry point. Dynamic app config is not permitted in this release contract.`);
  }
}

for (const section of ["dependencies", "devDependencies"]) {
  const declared = packageJson[section] ?? {};
  const locked = rootLockPackage[section] ?? {};

  for (const [name, version] of Object.entries(declared)) {
    if (locked[name] !== version) {
      fail(`${section}.${name} is not synchronized with package-lock.json.`);
    }
  }
}

const expectedRuntime = {
  expo: "~54.0.37",
  "react-native": "0.81.5",
};

for (const [name, version] of Object.entries(expectedRuntime)) {
  if (packageJson.dependencies?.[name] !== version) {
    fail(`${name} must remain ${version}; update this release contract only as part of an explicitly reviewed runtime upgrade.`);
  }
}

const lockText = readFileSync(resolve(root, "package-lock.json"), "utf8");
if (/replit(?:\.com|\.dev|\.local)|npm\.replit|packages\.replit|package-firewall/i.test(lockText)) {
  fail("package-lock.json contains a Replit-internal registry URL that CI cannot use.");
}

for (const match of lockText.matchAll(/"resolved"\s*:\s*"([^"]+)"/g)) {
  const url = match[1];
  if (!url.startsWith("https://registry.npmjs.org/")) {
    fail("package-lock.json uses a non-public npm resolved URL: " + url);
  }
}

const npmrcPath = resolve(root, ".npmrc");
if (existsSync(npmrcPath)) {
  const npmrc = readFileSync(npmrcPath, "utf8");
  if (/(?:^|\n)\s*(?:force|legacy-peer-deps)\s*=\s*true\s*(?:\n|$)/i.test(npmrc)) {
    fail(".npmrc enables force or legacy-peer-deps, which is not allowed in CI.");
  }
}

const expo = appConfig.expo;
if (expo.android?.package !== "com.mtuaes.dubaifans") {
  fail("The Android application ID must remain com.mtuaes.dubaifans.");
}
if (expo.runtimeVersion?.policy !== "appVersion") {
  fail("runtimeVersion must use the appVersion policy.");
}
if (easConfig.build?.production?.android?.buildType !== "app-bundle") {
  fail("The production EAS profile must use Android app-bundle output.");
}
if (easConfig.build?.production?.autoIncrement !== true || easConfig.cli?.appVersionSource !== "remote") {
  fail("Production versioning must remain EAS remote auto-incremented; CI must not guess version codes.");
}

console.log("CI release contract is valid.");
console.log(`Expo SDK: ${packageJson.dependencies.expo}`);
console.log(`React Native: ${packageJson.dependencies["react-native"]}`);
console.log(`Android package: ${expo.android.package}`);