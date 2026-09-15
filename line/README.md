# LINE setup

The web app provides four LIFF endpoint URLs:

- `/liff/health`
- `/liff/care`
- `/liff/profile`
- `/liff/symptom`

Create one LIFF app for each endpoint in LINE Developers, then use each generated
`https://liff.line.me/{liffId}` URL in the rich menu setup script.

Required environment variables:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LIFF_HEALTH_URL`
- `LIFF_CARE_URL`
- `LIFF_PROFILE_URL`
- `LIFF_SYMPTOM_URL`

Run `node line/setup-rich-menu.mjs` to create, upload, and set the menu as default.
The token must stay in the local environment and must not be committed.
