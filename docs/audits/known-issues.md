# Known Issues and Verification Notes

This page replaces an older issue list whose dependency workaround, bootstrap instructions, and credentials no longer matched the checkout. Historical release notes remain in the changelog.

- **Database provisioning:** the previously referenced `scripts/schema.sql` is absent. The supporting table creation in `lib/api.ts` is not a complete schema. Establish the authoritative schema before provisioning a new database.
- **Offline coverage:** local storage and sync exist for some workflows. Confirm offline and reconnect behavior for each workflow before relying on it.
- **Lint compatibility:** the earlier documentation described an automatic ESLint compatibility patch. Neither the named patch script nor that post-install action is present in the current package configuration. Run the current lint command to assess the installed dependencies.
- **Initial administrator:** the setup route requires configuration and a submitted password. Review the implementation and use a unique strong password; do not rely on previously documented default credentials.

These notes were checked against the source during the documentation review. They are not results of a new application test run.
