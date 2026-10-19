# Korean APK build patches

This fork builds APKs from the latest public `kelai141/dsh-mobile-apk` `main` branch.
Korean translations are not committed onto the upstream source branch. They live
as ordinary `git apply` patches in the fork's `l10n/ko` branch:

```
l10n/ko
  localization/
    README.md
    patches/
      001-android-korean.patch
      002-webview-korean.patch
```

The example patch names above are illustrative. No translation changes are
included yet.

## Updating translations

1. Start a working tree from the latest upstream `main` commit.
2. Edit the Android resources, WebView UI, or other tracked text resources.
   Do not edit generated archives or APKs.
3. Generate a patch of the relevant changes, for example:

   ```bash
   git diff --binary -- app/src/main/res > 001-android-korean.patch
   ```

   To capture newly added resources, first stage those files, then use
   `git diff --cached --binary -- app/src/main/res`.
4. Upload the `.patch` file to `localization/patches/` **on `l10n/ko`**.
   Rename or replace old patches as appropriate; files are applied in
   lexicographic filename order. Don't upload the changed source files to the
   localization branch: the workflow only reads the patch files.
5. Push to `l10n/ko`. The fork's workflow will fetch the newest upstream
   revision, apply each patch, and build APKs for both CPU architectures.

If a patch no longer applies after an upstream update, the workflow fails at
`git apply --check`. Rebase/regenerate the conflicting patch against the new
upstream source. No unpatched APK is published from a failed job.

## Where to download

Open **Actions > Korean APK from upstream > latest successful run > Artifacts**
and download `dsh-ko-arm64-*` for most physical Android phones or
`dsh-ko-x86_64-*` for a matching x86_64 emulator. APKs are signed with this
project's checked-in debug keystore; they are **not** production releases.
Artifacts expire after 30 days. A weekly rebuild keeps a fresh artifact when
the upstream source and translation patches have not changed.

`workflow_dispatch` lets you choose an ABI and force a rebuild. A nightly
scheduled run checks for upstream updates at approximately **03:15 KST**;
GitHub may delay scheduled workflows.

## Setup

- Make the GitHub fork **public**, preserve Git LFS data in upstream, and enable
  GitHub Actions for the fork.
- Add `.github/workflows/ko-upstream-apk.yml` to the fork's default branch.
- Create `l10n/ko` and add this README and `localization/patches/.gitkeep`.
  The patch branch can be protected so only you can update it.
- Run the workflow manually once. Check signature verification and build
  logs before installing an APK.

Only install builds whose source and patch revisions you trust. The workflow
records both commits and the APK SHA-256 in `KO-BUILD-SOURCES.txt` alongside
each downloadable artifact.
