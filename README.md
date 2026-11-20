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


Source sync checkpoint (2026-11-19): completed Main ID + Duplicate ID notification trigger wiring; trigger now handles both ID types. Migration `56e2d95f0cb5c7cba4664fdf2cfad6f46c680556`, source-contract test `6c81f6ac756e9b36c33629c774fcc437b8d76000`, status `f59221b49dd9c8c3e0470284d7cce0baa41cf1fe`, register `d9b9f8c7264ab0954c78f74e7a8549cb07fea4ff`. Trigger TEST-only Preview sync.


Source sync checkpoint (2026-11-19): live notification inbox delivery added (member-scoped and Admin policy-scoped Realtime subscriptions, INSERT/UPDATE/DELETE handling, channel cleanup). UI `94b7afbb3ad5b2ef11df68df8e43658f07ec8890`, test source `e23dda5aae6d4fc291c082907f1ec2aef58d8ff0`, status `93c78cbabbe3737ecc33b9a06334badd31460645`, register `f9a7fb98a46c83470c21798569b3d5928676527f`. Trigger TEST-only Preview sync.


Source sync checkpoint (2026-11-19): member auction submission editing/resubmission added on BiddWorld completion-work. UI commits 9877925e96a83564d69ebce7be8b7a0bae927199, 658d955a0315d7d92d33e8eadabdbdd4c7ee0af8, 826332c36b14eff623be56a03b57f02e0386f24f; source migration 607eecceb05f11bfac3f9fb02f1d2e93261a9fa9; manifest 04f67481ae602ba8c6e61e0da5277e6ee5c6c0d4; source test 1522eb7d6f77dd5a2e45bdfc3e1e7c60fd067935; status 791432cf4da8e0c73e8832a405f002df9553ad2a; completion register 99b8e9900a7bbdeaa3322f5735ba91ce708a7634. Trigger TEST-only Preview deployment and verify its outcome in Actions.


Source sync checkpoint (2026-11-19): separate OLX-style member product submission and Admin moderation added to BiddWorld completion-work. Migration e1592c9b03f992e4df81ebc7aab8d38f5198a08f; member UI 4f8259ffcc09fe7dc68dd3464ca47acc5b1343e7; Admin review UI b60f81c251905966eb3d76090122de6dbaf7a6ef; App integration 31298afb947876ae708c4da178bb086613bb5ddf and Admin integration 68fd52e6f5e2c2bd970aa07f35496b80a96d3e55; manifest 7b36476f84fac70e71688af540c9de7f09c31294; source test e85ee5adcc2dcb60bb45d982d80d1d91bf514d3c; status 3d035bb40e7294f414f3feac60257f0ffe9ddd20; completion register 070e784f72bf1a047ff1bf59491d781c59b83950; remaining work 2bf8142ed67fe75f73de77debc018b9227405a20. Trigger isolated TEST-only Preview build/deploy and verify Actions result.


Source sync checkpoint (2026-11-19): BiddWorld `completion-work` now includes member product listing edit/resubmit for Pending and Rejected submissions. Migration `20261119450000_member_product_submission_editing.sql`; UI `dd0448a0213eb6bf1f124d17be29c241cca13b53`; clean-install manifest `700343a79339b0293db5bc024451f65f26d28630`; source regression `2377b59610ff1ec85409c760b27d67dd10bc5240`; status `0cac27191ec95a85de6b4e1b4a4e313b766c4140`; completion register `62684d5329fe138a1aba30799aa9e3e98885d52c`; remaining work `cac1f96e8084d15ff98ee8bce0fae01d6597dda0`. This sync triggers the isolated TEST-only Preview deployment; verify Actions before treating the update as live.


## Source sync checkpoint (2026-11-20)

The preview workflow now needs to consume the latest BiddWorld `completion-work` head `b3cda1259e29e49a552a710131eb8a1f6c9b7cd7` (wallet funding member history and Admin review queue integrity batch). This README commit triggers a fresh isolated TEST-only build/deployment. The workflow must pass its exact TEST URL and publishable-key checks; it does not apply Supabase migrations or run the application test suite. Treat the preview as updated only after the new GitHub Actions run completes successfully.


## Source sync checkpoint (2026-11-20 — strict build repair)

BiddWorld `completion-work` now includes commit `38fe63c0dd14427e65995826d0829232e7edb056`, correcting the strict TypeScript failures found by Preview run #30 across Admin data parsing, restricted Staff button states, nullable TEST client handling, and Wallet History filtering. This README commit triggers a fresh isolated TEST-only type-check/build/deployment using the corrected `/biddworld-preview/` base path. Verify the new Actions run before treating the site as published.
