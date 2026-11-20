# BiddWorld — Isolated Visual Preview

This repository hosts the isolated preview deployment configuration. Every preview deployment checks out the latest `completion-work` source from `kkjan2006-self/biddworld`, so the preview reflects the development batch rather than an older copied snapshot.

- Deployment configuration branch: `main` in this repository; application source: `completion-work` in `kkjan2006-self/biddworld`
- Website base path: `/biddworld-preview/`
- Deployment: GitHub Pages via `.github/workflows/deploy-preview.yml`
- Build only: automated tests are intentionally not run in the preview workflow
- Database: preview uses only the isolated BiddWorld-TEST Supabase project through repository secrets; it fails closed unless the exact TEST URL and publishable key are present
- Main project repository and its `main` branch are not changed by this preview repository

Preview URL:
https://kkjan2006-self.github.io/biddworld-preview/

## Latest source sync checkpoint (2026-11-20)

The preview workflow is triggered by this commit and checks out the current BiddWorld `completion-work` branch head:
`eb805c6f7cf44aa1acb48b88225ef2a8afa18e6b` (Fixed Bid catalogue strict ordering and continuation-page boundary integrity, following the package activation response and Admin package activation pagination integrity batches).

The isolated preview workflow runs the project's configured TypeScript/build step only, uses the exact TEST Supabase project, and does not apply database migrations or run the automated test suite. Treat the preview as updated only after the corresponding GitHub Actions run completes successfully.

## Deployment retry checkpoint (2026-11-20)

The previous preview build checked out BiddWorld `completion-work` commit `eb805c6f7cf44aa1acb48b88225ef2a8afa18e6b` and correctly stopped at a TypeScript syntax error in `src/components/MemberPlaceAuction.tsx`. That syntax error has been corrected in BiddWorld commit `de91135a7db146fc814a2550439efdac000a79a9`. This README update triggers a fresh TEST-only Pages build against the latest `completion-work` head. Do not treat the site as updated until its GitHub Actions deployment run succeeds.
