# MotionPress E2E tests

Playwright verifies the public landing page, technical SEO, authentication,
localized account recovery, the AI Studio shell, CMS access control, and the
administrator workflow.

## Local run

Start the application on `http://localhost:3000` with its API on
`http://localhost:3001`. Start the journal on `http://localhost:4321` when
running `adminWorkflow.spec.ts`.

```powershell
npm install
npx playwright install chromium
npm test
```

The administrator workflow reads `E2E_ADMIN_EMAIL` and
`E2E_ADMIN_PASSWORD`. If they are omitted, it uses the documented local
development account. The configured account must have the active `ADMIN`
role.

Use `npm run test:ui` for interactive debugging or `npm run test:headed` to
watch the browser. `WASP_SERVER_URL` can override the default API origin.
