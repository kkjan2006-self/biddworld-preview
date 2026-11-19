# BiddWorld — Isolated Visual Preview

This repository contains a separate preview copy of the `completion-work` branch from the main BiddWorld repository.

- Preview branch: `main` in this repository only
- Website base path: `/biddworld-preview/`
- Deployment: GitHub Pages via `.github/workflows/deploy-preview.yml` (Pages must be enabled once by the repository owner)
- Build only: automated tests are intentionally not run in the visual-preview workflow
- Database: no Supabase URL or key is supplied to this preview build; member/admin data operations are not enabled
- Main project repository and its `main` branch are not changed by this preview repository

Preview URL (available after the GitHub Pages workflow succeeds):
https://kkjan2006-self.github.io/biddworld-preview/


## One-time GitHub Pages setup

The deployment workflow intentionally does not try to enable GitHub Pages through its workflow token. GitHub restricts that repository-settings operation to an owner/admin token, which can produce `Resource not accessible by integration`.

Before the first deployment, the repository owner must open **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the Source, and save. Then open **Actions → Deploy isolated BiddWorld visual preview → Run workflow** (or push a new commit) to build and publish. The workflow uses only the visual-preview mode, does not receive Supabase URL/key secrets, and runs `npx vite build` without tests or database access.
