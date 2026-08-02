# Contributing to Curator

Thanks for taking the time to contribute. A couple of things to know before you do, since this repo isn't a typical open-source project.

## License terms for contributions

Curator is **source-available, not open source** — see [LICENSE](LICENSE). In short:

- You're welcome to read the code and submit issues and pull requests.
- You may **not** self-host, redeploy, or reimplement Curator's functionality elsewhere without written permission.
- **By submitting a pull request, your contribution becomes the sole property of Alex Radu under the project license — you retain no rights to it.** Don't submit anything you're not comfortable with under those terms.

If that doesn't work for you, opening an issue to discuss the idea first (without code) is completely fine.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Participation in issues, pull requests, or discussions means you agree to follow it.

## Getting set up

Full local setup (Docker Postgres/Qdrant, env files, migrations) is documented in the [README](README.md#quick-start) — follow that before making changes.

## Making a change

1. Open an issue first for anything non-trivial (new features, behavior changes) so we can align on approach before you put in the work. Small, obvious fixes (typos, clear bugs) can go straight to a PR.
2. Keep PRs focused — one change per PR. Unrelated cleanup makes review harder and slower.
3. Match the existing code style and patterns in the surrounding files rather than introducing a new convention.
4. If you change anything affecting data collection, storage, third-party services, or user rights, the [Terms of Service](public/terms-of-service.md) and [Privacy Policy](public/privacy-policy.md) need updating too — see `AGENTS.md` for what that covers.

## Before opening a PR

Run these locally and make sure they pass:

```bash
npm run lint
npm test
```

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when opening an issue. Include steps to reproduce, what you expected, and what actually happened — screenshots help a lot for UI issues.

## Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Explain the problem you're trying to solve, not just the solution you have in mind — sometimes there's a simpler fix.

## Questions

For anything not covered here, use the in-app [Support](https://curatorfrc.com/support) page or email **alex@alexradu.co**.
