# BiddWorld — Isolated Visual Preview

This repository hosts the isolated preview deployment configuration. Every preview deployment checks out the latest `completion-work` source from `kkjan2006-self/biddworld`, so the preview reflects the development batch rather than an older copied snapshot.

- Deployment configuration branch: `main` in this repository; application source: `completion-work` in `kkjan2006-self/biddworld`
- Website base path: `/biddworld-preview/`
- Deployment: GitHub Pages via `.github/workflows/deploy-preview.yml` (Pages must be enabled once by the repository owner)
- Build only: automated tests are intentionally not run in the preview workflow
- Database: preview uses only the isolated BiddWorld-TEST Supabase project through GitHub Actions secrets; never configure Production credentials here. The workflow now fails closed before deployment if either secret is missing or if the URL is not the exact TEST project. Once the owner adds the two required repository secrets, Auth, member/admin reads and backend actions can connect to TEST. Actual feature availability still depends on the installed TEST schema, RLS, Storage policies and feature settings.
- Main project repository and its `main` branch are not changed by this preview repository

Preview URL (available after the GitHub Pages workflow succeeds):
https://kkjan2006-self.github.io/biddworld-preview/


## One-time GitHub Pages setup

The deployment workflow intentionally does not try to enable GitHub Pages through its workflow token. GitHub restricts that repository-settings operation to an owner/admin token, which can produce `Resource not accessible by integration`.

Before the first deployment, the repository owner must open **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the Source, and save. Then open **Actions → Deploy isolated BiddWorld visual preview → Run workflow** (or let the next preview configuration commit trigger it) to build and publish. Each development batch must update this preview repository after the `completion-work` commits, which starts a fresh deployment using the current development source. The workflow builds in `test` mode using `BID...` repository secrets and runs `npx vite build` without tests. Add these two repository secrets before rerunning the workflow:

- `BIDDWORLD_TEST_SUPABASE_URL` = `https://yoaauthwejdgaevfvwpo.supabase.co`
- `BIDDWORLD_TEST_SUPABASE_PUBLISHABLE_KEY` = the **publishable** (not service-role) key from the isolated BiddWorld-TEST project.

Do not add Production URL/keys or any service-role/secret key. The browser receives only the publishable key; database RLS and server-side RPC authorization must enforce access.


Latest source sync checkpoint: BiddWorld development branch `completion-work`, batch commit `3aa2f114c2e6e57267f2f629fa202cb240d0a0f3` (Admin auction and Fixed Bid result validation). A push to this preview repository starts the isolated Pages workflow, which checks out the latest development branch. Deployment outcome must be confirmed in GitHub Actions before describing this checkpoint as live.


Latest development source checkpoint: `52722b2601f118da693b2cd8d273c4b90b70919c` (Admin Staff JSX correction), plus subsequent status/register commits. This commit updates the source consumed by the preview workflow; deployment status is confirmed separately in Actions.


Source sync checkpoint (2026-11-19): wallet funding review page validation update on BiddWorld `completion-work` (UI `f5fc6d51bd9abfad6229d173b927ee9e3ff3fd1b`; source regression `c59c674af07ce68d11ebad4df8ba0c5c9e445818`; status `ca02b496d08e19267faadb81dca2897e4c417ec7`; register `f116e902cdc410dbcd79bb4a07b29f57eb64b4d8`). Push triggers the isolated TEST-only Preview workflow; verify Actions before treating the update as live.


Source sync checkpoint (2026-11-19): corrected Admin workspace delivery-tracking block structure in BiddWorld `completion-work` (`df4e7eb459bdd97aa03a97e24011cd14f191b064`), regression source `2a100bfe83712f8cc65dbd82ee5af436dc69522b`, status `a6da66a0648b7a761c980e55f815432bb83f5d2b`, register `7bf844ad46c9d49550ba20a8594e2465187a4302`. This README update triggers the TEST-only Preview workflow; check Actions for its final result.


Source sync checkpoint (2026-11-19): corrected escaped newline syntax in Admin Matrix commissions (`7531e99d5550b515298a2fd87e6f097618556748`), regression source `07b2bc2d69e4a5bb9abd54ff52d338b309f0b7f3`, status `2a50b5c923d79aedc5654d31d98e75878de12bcc`, register `8d813ce33bd341e6d87b43ca6fe4a8072a8507ad`. Trigger TEST-only Preview deployment.


Source sync checkpoint (2026-11-19): BiddWorld `completion-work` now includes member workflow status notifications migration `e4a48795d1a23dce3f247bc1aff89b4d410ba6c4`, source-contract test `f454b21108c11d3f7d37f3f85e943f28e69bd972`, forward manifest `19a37d802f3fe382224b56007846b856a56db738`, status `a74efd24f41dcdb4971def7ddc4e8c80d74d45a5`, and register `ccc3c513e04d94fa3950f29d3da2435db1c2132d`. Trigger TEST-only Preview synchronization and deployment.


Source sync checkpoint (2026-11-19): expanded member workflow in-app notifications to Main ID status and wallet funding approval/rejection. Latest migration commit `5bb7aba954e76b128c84a8440b33908ef8e718d3`; regression source `1c710e4918d147ff2a98407a90b8d301b827962b`; status `739ef1ddf5f45a42c147618b9204bb4463f8cf63`; completion register `f744824c5beb73896d57beda2a5c7ad99e6d5ced`. Trigger TEST-only Preview sync.
