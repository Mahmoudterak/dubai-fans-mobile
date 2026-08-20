# Dubai Fans Mobile CI/CD

## Scope and safety

This setup only automates validation and release operations for the mobile project. It does not modify application behavior, the backend, API contracts, authentication, payments, Expo SDK, React Native, or release versions.

All EAS commands set both `EAS_NO_VCS=1` and `EAS_PROJECT_ROOT=$GITHUB_WORKSPACE`. This is intentional: in the Replit workspace the mobile source lives at `artifacts/dubai-fans-mobile`, outside the current Git root, so the workflow must archive the checked-out mobile project rather than an unrelated repository.

Each workflow also sets the Node setup action to `https://registry.npmjs.org`. This keeps the clean `npm ci` install on the public registry used by EAS and prevents an inherited local registry setting from masking lockfile problems.

## Workflows

| Workflow | Trigger | Result |
| --- | --- | --- |
| **Mobile CI Validation** | Pull requests, pushes to `main`/`master`, or manual dispatch | Runs dependency contract checks, `npm ci`, TypeScript, Expo config, Expo Doctor, optional tests, whitespace checks, and records the checked-out source commit. |
| **Mobile Development Build** | Manual dispatch with a reason | Re-runs validation, then starts an Android `development` EAS build. It never runs from a production workflow. |
| **Mobile EAS Update (Development)** | Manual dispatch with a release note | Re-runs validation, finds the latest successful compatible Development Build from GitHub Actions provenance, rejects native/config/dependency changes, and publishes only to the `development` branch. It cannot publish a production update. |
| **Production Release** | Manual dispatch with an approval note, plus the protected `production` environment approval | Re-runs the full CI gate, builds Android through EAS profile `production`, downloads only the AAB, verifies its embedded Hermes bundle, and uploads the verified AAB and metadata for internal testing. It does not submit to Google Play. |

## Required GitHub configuration

1. Put this mobile directory in its own GitHub repository, or ensure it is a tracked subdirectory of the repository that executes these workflows. GitHub Actions only runs workflow files that are committed below the repository's `.github/workflows/` directory.
2. Add an `EXPO_TOKEN` GitHub Actions secret with permission to build and publish updates for the Expo project.
3. Create a GitHub Environment named `production` and require reviewers for it. The Production Release workflow references this environment, so dispatching it pauses for explicit approval.
4. Optionally protect the `development` environment if Development Build and EAS Update need an approval gate.

No tokens, credentials, payment secrets, or backend secrets belong in the repository or workflow files.

## Versioning

The production profile retains `appVersionSource: remote` and `autoIncrement: true`. CI never edits `version` or guesses an Android `versionCode`. EAS is responsible for allocating the next remote Android version code; a failed EAS allocation fails the release instead of being worked around.

## EAS Update compatibility gate

The EAS Update workflow does not trust an assertion selected in the dispatch form. It reads successful **Mobile Development Build** workflow commits from GitHub Actions and uses the most recent commit that is an ancestor of the current source as its compatibility baseline. It then fails if the change set contains native folders, static or dynamic Expo/EAS configuration, dependencies/lockfile, build configuration, app icon/splash changes, deletions, or rename/copy operations involving those paths. Dynamic `app.config.*` files are rejected by the release contract rather than silently overriding `app.json`. Run **Mobile Development Build** instead whenever this gate fails.

## Artifact and source verification

The Production Release workflow records the GitHub checkout commit before building and requires a clean checkout. The same immutable checkout is passed to EAS through `EAS_PROJECT_ROOT`. Because `EAS_NO_VCS=1` is required for this Replit layout, EAS itself may not retain a Git commit field; the workflow stores the source commit alongside the remote Build ID and artifact URL.

After EAS reports `FINISHED`, the workflow downloads the AAB, validates the ZIP archive, requires `base/assets/index.android.bundle`, disassembles its Hermes bytecode, and verifies current contact, service, CTA, and external-link markers. Any missing marker, non-AAB artifact, download failure, or EAS failure stops the release before the artifact is uploaded.

## Replit and Git limitation

The mobile source is maintained in its own Git repository rooted at `artifacts/dubai-fans-mobile`, even though the surrounding Replit workspace also contains the unrelated `dubai-fans-api` Git repository. GitHub Actions must be run from this mobile repository so checkout, `GITHUB_SHA`, and `EAS_PROJECT_ROOT` all refer to the same source.