# Object-linked actions

Saved actions now have optional object IDs. In **Link objects to actions**, choose any saved action, select zero, one or several objects from the same video and save. Manual and voice-created actions use the same records. Existing action labels and source stay intact; later edits preserve links. Changing links resets review to pending. The segment review card displays linked object names and identities.

The new **Export linked actions JSON** includes action times, labels, source, review status, object IDs, referenced objects and their usable frame observations. Disqualified actions and shapes are excluded without deleting them. Existing four-column CSV and legacy JSON stay unchanged.

Visibility remains **Needs checking**: saved boxes/polygons are frame samples, not continuous tracking. The interface reports how many usable samples fall inside the action, including zero when no outline remains there. Object identities persist even when their last outline is deleted. No artificial visibility, absence or automatic action-understanding claim is added.

The backend validates workspace ownership, same-video object membership, no duplicates and at most 100 linked objects. Old actions need no migration. Build and four local browser checks passed for linking/refresh/edit preservation, review reset, privacy, export and existing annotation/setup flows. Live release evidence is recorded after publication.
