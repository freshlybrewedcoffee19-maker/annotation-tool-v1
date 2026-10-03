# Annotation tool v1

Upload an MP4, MOV or WebM, mark and edit labelled segments, and export all segments as CSV or JSON. Videos, custom label lists, metadata fields, metadata values, defaults and segments are saved in Convex. This is a shared workspace with no login.

The flow is Upload → Metadata → Annotate → Export. Use Back/Next or the step tabs; arrow keys, Home and End navigate focused tabs. Changing steps keeps the video and forms mounted, preserving marked times and drafts. Leaving Annotate pauses the video and turns the mic off while keeping its marked times.

- Metadata fields are your own list, one per line. There are no preset domain fields or labels.
- Locked defaults apply only to new uploads. Existing values stay unchanged; a field can be unlocked for one video.
- Space plays/pauses, `[` marks start and `]` marks end, outside text fields and controls.
- Start at zero or the previous segment's end. Preview start, end and duration before saving.
- Set a frame rate to show current and boundary frames. Frame numbers use `Math.round(seconds * frame rate)`, starting at zero.
- New records have stable per-episode IDs and a manual/voice source. Older records keep their data and show a legacy ID or “Not recorded” for details that were not saved.
- Coverage checks and timeline markings show gaps and overlaps. View segment seeks and highlights it.
- The original CSV and JSON still export all episodes with `episode,label,start_sec,end_sec`. Episode CSV adds record details; metadata CSV exports the selected video's file details and current custom fields, prefixed with `metadata.`.
- Annotate next video keeps all saved work. No episode is automatically cleared, even after export.

The approved rebuild's raw browser evidence is in [FEATURE_PROOFS.md](FEATURE_PROOFS.md). Deliberately deferred features are in [LATER.md](LATER.md).

Voice labelling uses Chrome's built-in speech recognition:

- Say **start** to play the video and mark the start.
- Say **stop** to pause the video and mark the end.
- Say a saved label to save the segment.

Start and stop act on interim speech results once per phrase. Labels wait for final results. The screen shows mic state, heard words, and the next command.

## Run locally

1. Run `npm ci`.
2. Run `npx convex dev` to connect your Convex deployment and push backend functions.
3. Set `VITE_CONVEX_URL` in `.env.local` to your deployment's `.convex.cloud` URL, as shown in `.env.example`.
4. In a second terminal, run `npm run dev`.

## Check and deploy

- `npm run build` checks the code and builds the app.
- `npm test` runs the browser tests using an installed Google Chrome. Start the local app first. Tests upload sample videos and create test segments in the connected deployment.
- `npm run deploy` pushes the backend and publishes through Convex static hosting to the existing deployment selected in `.env.local`, preserving that deployment's saved data. A GitHub push does not deploy it.

The browser tests inject speech results into the same code used by the mic; they do not test actual microphone recognition.

GitHub saves the code and its history. Convex stores the uploaded videos and annotation data separately. Credentials and local environment files are excluded from this repository.
