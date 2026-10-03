# Annotation tool v1

Upload an MP4, mark and edit labelled segments, and export all segments as CSV or JSON. Videos, custom label lists, and segments are saved in Convex. This is a shared workspace with no login.

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
- `npm run deploy` publishes the app through Convex static hosting. A GitHub push does not deploy it.

The browser tests inject speech results into the same code used by the mic; they do not test actual microphone recognition.

GitHub saves the code and its history. Convex stores the uploaded videos and annotation data separately. Credentials and local environment files are excluded from this repository.
