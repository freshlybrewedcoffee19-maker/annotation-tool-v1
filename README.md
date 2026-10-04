# nAIve Physics

The opening page offers **Annotate your own videos** and **Trial video annotation**. Own videos opens three short setup questions for reusable labels, metadata fields and default values. Each question can be skipped, or **Skip to annotation** opens the dashboard immediately. New uploads open Annotate directly. Defaults carry into future videos; unlock a field to change only the current video's metadata. Labels can be changed per video; **Use these labels for future uploads too** also changes the reusable list.

**Review & export** presents one segment video card at a time. Verify, Disqualify or Edit annotation; swipe the card right/left or use its arrow keys to decide. Previous/Next clip and Undo last decision keep review reversible. Review decisions persist in Convex. Disqualified records stay saved and are excluded from header CSV/JSON and episode CSV. Editing an annotation resets its review to pending. Pending and verified annotations remain exportable.

The opening-page images are five still frames captured from the existing trial clip. This update preserves the original workspaces, footage and annotations. `tests/can-setup-and-review.spec.ts` covers setup skipping, inheritance, per-video overrides, review persistence, export exclusions and review ownership.

Upload an MP4, MOV or WebM, mark and edit labelled segments, and export all segments as CSV or JSON. Videos, custom label lists, metadata fields, metadata values, defaults and segments are saved in Convex. Workspaces are private to each browser, with no login.

**Trial video annotation** on the first screen loads a 45-second extract of the owner's IRON_001 dataset episode, with matching labels and all 32 dataset metadata fields filled. It opens Annotate directly. Turn mic on is next to the video on laptops and below it on phones; optional manual annotation lives in the collapsed **Label by hand** section below. The interface uses red, cream and dark text.

Workspace access uses a random 256-bit browser key stored locally. Every public data function checks that key and episode ownership in Convex, including reads, edits, deletion, metadata, upload ownership and exports. Queries without a workspace key cannot return the original shared data. Trial seed configuration and original-work preservation are internal functions accessible only through the authorized Convex CLI.

Existing videos and segments were preserved in an owner workspace without changing their contents, labels or original exports. A private recovery link is saved locally in `outputs/np-tools-owner.html`; it is excluded from git. Recovery keys and snapshots live in `.np-tools-private/`, also excluded from git. Keep these files private. A trial never receives the owner's key. **Return to my workspace** switches back to the browser's previous workspace without clearing either workspace.

After setup, the dashboard offers Upload, Metadata, Annotate and Review & export. Metadata is optional. Use Back/Next or the step tabs; arrow keys, Home and End navigate focused tabs. Changing steps keeps the annotation player and forms mounted, preserving marked times and drafts. Leaving Annotate pauses the video and turns the mic off while keeping its marked times.

- Metadata fields are your own list, one per line. There are no preset domain fields or labels.
- Locked defaults apply only to new uploads. Existing values stay unchanged; a field can be unlocked for one video.
- Space plays/pauses, `[` marks start and `]` marks end, outside text fields and controls.
- Start at zero or the previous segment's end. Preview start, end and duration before saving.
- Set a frame rate to show current and boundary frames. Frame numbers use `Math.round(seconds * frame rate)`, starting at zero.
- New records have stable per-episode IDs and a manual/voice source. Older records keep their data and show a legacy ID or “Not recorded” for details that were not saved.
- Coverage checks and timeline markings show gaps and overlaps. View segment seeks and highlights it.
- The original CSV and JSON still use `episode,label,start_sec,end_sec`, including only episodes in the current private workspace. Episode CSV adds record details; metadata CSV exports the selected video's file details and current custom fields, prefixed with `metadata.`.
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
- `node scripts/run-bounded.cjs npm test` stops the command after two minutes. The privacy test also uses the installed Microsoft Edge and verifies two browsers cannot read, edit, delete, alter metadata, claim uploads or export each other's work. Tests use isolated trial workspaces, never the owner's saved workspace.
- `APP_URL` can point the tests or `scripts/prove-trial.cjs` at the live app. The proof script saves screenshots and verbatim observations in `outputs/`.
- `npm run deploy` pushes the backend and publishes through Convex static hosting to the existing deployment selected in `.env.local`, preserving that deployment's saved data. A GitHub push does not deploy it.

The browser tests inject speech results into the same code used by the mic; they do not test actual microphone recognition.

GitHub saves the code and its history. Convex stores the uploaded videos and annotation data separately. Credentials and local environment files are excluded from this repository.
