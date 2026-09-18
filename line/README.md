# LINE setup

The rich menu has three actions:

- `/liff/content` for the combined health information and care guidance hub
- `/liff/profile`
- `/liff/symptom`

Create LIFF apps for the profile and symptom endpoints, then use each generated
`https://liff.line.me/{liffId}` URL in the rich menu setup script. The combined
content hub uses the deployed website URL by default.

Required environment variables:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LIFF_PROFILE_URL`
- `LIFF_SYMPTOM_URL`

Optional:

- `CONTENT_HUB_URL` (defaults to `https://ileal-conduit-dashboard.netlify.app/liff/content`)

Run `node line/setup-rich-menu.mjs` to create, upload, and set the menu as default.
The token must stay in the local environment and must not be committed.
