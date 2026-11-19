# BiddWorld — Isolated Visual Preview

This repository contains a separate preview copy of the `completion-work` branch from the main BiddWorld repository.

- Preview branch: `main` in this repository only
- Website base path: `/biddworld-preview/`
- Deployment: GitHub Pages via `.github/workflows/deploy-preview.yml`
- Build only: automated tests are intentionally not run in the visual-preview workflow
- Database: no Supabase URL or key is supplied to this preview build; member/admin data operations are not enabled
- Main project repository and its `main` branch are not changed by this preview repository

Preview URL (available after the GitHub Pages workflow succeeds):
https://kkjan2006-self.github.io/biddworld-preview/
