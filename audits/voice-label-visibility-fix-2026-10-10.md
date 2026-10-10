# Saved voice labels visible in V2

Reported: basic voice labelling appeared not to save. Asked which editor was affected; no answer received before this verified fix. Do not assume the report's original account or physical microphone failure was reproduced.

Reproduced in V2: simulated start/stop/Walking produced one saved database segment, but no saved-time-label region appeared. Existing V2 tests checked the database and missed that user-visible omission. A new assertion failed against the live release before the fix.

Fix: the annotation count now includes saved time segments, and the annotation view lists saved time labels with their exact start/end times and review state. The list uses the existing live saved-segments query. Microphone controls, recognition, timing and backend save functions are unchanged. Existing saved labels become visible without migration.

Validation: original V1 live voice test passed, including save/reload/export. All 32 code tests passed. Updated V2 browser flow passed locally and live, including visible label immediately after saving and after reload, drawing/correction, device recovery, swipe review and exports. Speech was simulated; physical microphone hardware not exercised.

Published through existing `npm run deploy`: Cloudflare deployment `d06182ba`, https://cheddarvox.com/v2 . Live asset `index-CPO9dOot.js` verified. No customer annotations edited or deleted, no backend code changed. Existing account usage warning remains outside this UI fix.
