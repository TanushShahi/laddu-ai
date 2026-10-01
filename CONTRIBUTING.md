# Contributing to J.A.R.V.I.S.

We welcome contributions to expand JARVIS's open-source capabilities!

## Development Guidelines
1. **Zero-Paid Requirement**: All core features must run using free and open-source tools.
2. **Safety First**: Any tool that alters files, settings, or processes must declare permissions and register with `DangerousActionProtector`.
3. **Tests Required**: Every feature must include automated tests in `tests/`. Run all tests before submitting PRs:
   ```bash
   npm test
   ```
4. **No Simulated/Fake Code**: Features presented in the HUD must genuinely execute.
