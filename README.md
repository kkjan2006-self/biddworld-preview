# BiddWorld — Isolated Visual Preview

This repository contains a separate preview copy of the `completion-work` branch from the main BiddWorld repository.

- Preview branch: `main` in this repository only
- Website base path: `/biddworld-preview/`
- Deployment: GitHub Pages via `.github/workflows/deploy-preview.yml` (Pages must be enabled once by the repository owner)
- Build only: automated tests are intentionally not run in the preview workflow
- Database: preview uses only the isolated BiddWorld-TEST Supabase project through GitHub Actions secrets; never configure Production credentials here. Once the owner adds the two required repository secrets, Auth, member/admin reads and backend actions can connect to TEST. Actual feature availability still depends on the installed TEST schema, RLS, Storage policies and feature settings.
- Main project repository and its `main` branch are not changed by this preview repository

Preview URL (available after the GitHub Pages workflow succeeds):
https://kkjan2006-self.github.io/biddworld-preview/


## One-time GitHub Pages setup

The deployment workflow intentionally does not try to enable GitHub Pages through its workflow token. GitHub restricts that repository-settings operation to an owner/admin token, which can produce `Resource not accessible by integration`.

Before the first deployment, the repository owner must open **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the Source, and save. Then open **Actions → Deploy isolated BiddWorld visual preview → Run workflow** (or push a new commit) to build and publish. The workflow builds in `test` mode using `BID...` repository secrets and runs `npx vite build` without tests. Add these two repository secrets before rerunning the workflow:

- `BIDDWORLD_TEST_SUPABASE_URL` = `https://yoaauthwejdgaevfvwpo.supabase.co`
- `BIDDWORLD_TEST_SUPABASE_PUBLISHABLE_KEY` = the **publishable** (not service-role) key from the isolated BiddWorld-TEST project.

Do not add Production URL/keys or any service-role/secret key. The browser receives only the publishable key; database RLS and server-side RPC authorization must enforce access.
