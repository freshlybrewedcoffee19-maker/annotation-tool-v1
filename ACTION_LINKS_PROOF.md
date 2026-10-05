# Object-linked actions

Saved actions now have optional object IDs. In **Link objects to actions**, choose any saved action, select zero, one or several objects from the same video and save. Manual and voice-created actions use the same records. Existing action labels and source stay intact; later edits preserve links. Changing links resets review to pending. The segment review card displays linked object names and identities.

The new **Export linked actions JSON** includes action times, labels, source, review status, object IDs, referenced objects and their usable frame observations. Disqualified actions and shapes are excluded without deleting them. Existing four-column CSV and legacy JSON stay unchanged.

Visibility remains **Needs checking**: saved boxes/polygons are frame samples, not continuous tracking. The interface reports how many usable samples fall inside the action, including zero when no outline remains there. Object identities persist even when their last outline is deleted. No artificial visibility, absence or automatic action-understanding claim is added.

The backend validates workspace ownership, same-video object membership, no duplicates and at most 100 linked objects. Old actions need no migration. Build and four local browser checks passed for linking/refresh/edit preservation, review reset, privacy, export and existing annotation/setup flows.

Released 5 October 2026 at https://precious-fish-294.convex.site/ from feature commit `e71973e`, deployment `70f87867-1d1c-4db8-be7b-6a910f77fa66`. All 12 browser checks passed against the published frontend and production backend in 2.7 minutes. The link check also confirms linked names appear on the action review card. Laptop and 390-pixel phone screenshots were inspected; the phone page stays within its viewport after the video overlay settles, with the segment table scrolling inside its container. Screenshots are in `test-results/action-links-laptop.png` and `test-results/action-links-phone.png`.

Voice-source actions were seeded for the linking check; speech-handler checks use simulated speech events. This release does not claim a fresh real-microphone test or continuous object tracking.
