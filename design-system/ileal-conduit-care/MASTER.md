# Clear & caring — Ilieal Conduit Care

## Scope and reference
Restyle the existing dashboard, patient/problem cards, login, video management and LIFF typography. Keep all routes, auth, triage, data and LINE integrations. No new assessments, demo, tracking workflow or metrics.

`concept.png` is an AI-generated visual reference, never production data or UI to embed. The primary layout is a white 248px sidebar, mint canvas, four consistent metrics, wide trend chart plus waiting list/urgency rail, then content analytics. Existing patient table continues below. Real application labels and counts override invented concept text.

## Design tokens
- Canvas #f3f8f7; white surface; muted surface #edf5f2; ink #173e3a; secondary #526d66; border #dce9e3.
- Primary #13766b/white; normal #237a56; watch #99600a; urgent #be424b. Every status includes text. Amber is darkened to meet normal-text contrast on its tinted background.
- Dark canvas #101f21; surface #192d2f; ink #edf6f1; secondary #b3c9c1.
- Noto Sans Thai and Inter, already self-hosted by Next. Body/controls 16px; metadata 14px; chart ticks 13px; sections 20px; page 30px; metrics 36px. Line height 1.65.
- 4/8/12/16/24/32 spacing; 18px panels; 10px controls; Lucide outline 20px, stroke 1.8.
- Four KPI cards use the same label/number/unit/explanation anatomy. Keep severity distinct from response state. Replies have dark readable text on a semantic green-tinted region.
- 340ms opacity/translate route entrance; 160–200ms interaction feedback; honor reduced motion. Counts never replay from zero on polling. No perpetual floating cards.
- Breakpoints 1280/1180/900/600. No document-level horizontal overflow; tables may scroll in labeled boundaries.

## Deliberate concept deviations
Use real labels/data, retain existing SVG brand mark, and retain existing content metrics (opens, period plays, total plays) rather than invented unique viewers. Tables and secondary pages extend the same system. No concept statistics are shipped. Mobile and login adapt the tokens instead of shrinking the desktop.

## Verification
Local browser QA uses anonymous mocked fixtures and blocks all real API mutations. Check desktop/mobile/dark/reduced-motion, chart controls, search/filter, history, reply feedback, media viewer, login and empty/error states. Check computed typography and contrast, not just screenshots. No real patient data in assets.
