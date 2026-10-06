# Dataset services proof — 6 October 2026

Approved service: raw data collection plus annotation using Cheddar Vox. Separate /services page linked from the opening page, branded with the approved palette.

Reused CaptureStory illustrations and visibility-aware motion from the owner's freshlybrewedcoffee19-maker/naive-physics repository. Omitted its old free-tool section, unverified dataset totals and external Formspree endpoint. Original sample-video download failed twice; the page uses the existing working 45-second trial footage instead, explicitly described as raw footage.

Private enquiries are stored in Convex datasetRequests. Server validates fields and limits repeated submissions per workspace. There is no public enquiry query. Confirmation appears only after saving succeeds. No email notification or enquiry inbox UI is connected; owner can inspect requests in Convex Data → datasetRequests.

Production build passed. Two local browser checks passed: services navigation/direct reload, real enquiry save, invalid-email rejection, no external form submission, trial playback, and returning to the opening page. Laptop and 390px phone screenshots inspected; no horizontal overflow. Existing annotation data was not modified.

Live publication: https://cheddarvox.com/services, code debd8f9, Cloudflare deployment 29733478. Both browser checks passed on the published custom domain (20.3s), including real enquiry saving, trial playback and returning-workspace navigation.

## Original sample restored — 6 October 2026
User requested the original sample section, vertical crop, animated human labels, matching copy and Hugging Face pilot link. Retrieved exact IRON_001_vertical.mp4 (8,180,326 bytes), matching poster and SampleDemonstration component from the owner's GitHub repository. Timings belong to the full 91.752-second episode, not the 45-second trial. The original six human-labelled intervals animate from playback time. Browser checks confirmed portrait dimensions, full duration and labels at 12, 34 and 85 seconds. Added a pause/play button, retained reduced-motion and offscreen pause behavior. Dataset card checked through hf CLI: published 12 episodes, four garments, three regions and 787.388 seconds support the restored stats. Original section copy preserved exactly; Cheddar Vox brand palette retained.

Loading cause: WorkspaceProvider hid all public content until workspace creation and a separate information query completed. Public content now renders immediately; annotation queries and the editor remain gated until the actual private workspace is ready. Clicks and enquiries wait for preparation before accessing saved data. Workspace keys and tokens are unchanged. With backend connections blocked, both marketing pages still render their actual headlines. Initial local paint observed at 72–80ms; this is laptop-preview evidence, not a promised visitor load time.

Initial checks could not run because the prior preview server had stopped. Restarted the preview and all three relevant checks passed. Laptop and phone screenshots inspected. Live release of this correction pending.
