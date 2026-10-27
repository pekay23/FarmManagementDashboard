# Deployment

The repository contains a GitHub Actions workflow for validation and Vercel deployment. Consult `.github/workflows/ci.yml` and `vercel.json` for the current configuration; account-level settings and live deployment status need separate verification.

## Workflow

The configured workflow runs installation, lint, type checking, tests when test files are present, environment validation, and a production build. Preview and production deployment jobs depend on validation and use GitHub environment configuration and Vercel credentials.

Keep deployment credentials in the appropriate secret store. The `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` repository variables identify the target project; their values do not need to be published in this guide.

## Database changes

The repository does not currently include the previously referenced `scripts/schema.sql`. Establish and review the authoritative schema and migration process before changing a shared database. See the [setup guide](./setup.md).

## Local checks

```sh
bun run lint
bun run type-check
bun run test
bun run build
```

These commands were not rerun for this documentation update.
