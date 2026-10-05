# Manual polygons

Polygons share existing saved object identities, video timestamps, ownership checks and review decisions with boxes. Click corners, finish the outline, move it, drag a vertex to refine it, undo changes, delete and recover. Draft points can be removed before completion; cancel, seek or playback discards unfinished drawing.

Coordinates stay relative to the video dimensions. Polygon points and bounds save in Convex through optional fields; old boxes need no migration. The server checks finite in-frame points, 3–100 corners, nonzero area and matching bounds. Vertex edits reset review to pending. Exports identify polygon shape and include its points; disqualified shapes remain saved and are excluded.

Shapes still apply only to their saved frame. No model, tracking, interpolation or exact frame-index claim is introduced. Frame stepping retains the existing estimated timing limitation. Complex self-intersecting outlines are not a supported segmentation format; use a simple outline around the object.

Released 5 October 2026, checkpoint `2efdb7f`. Build passed. Ten regression checks passed in the suite; the box check interrupted by a development reload passed separately on the settled build. Three live checks then passed: full box flow, full polygon flow, and opening-page/returning-workspace behavior. Laptop and phone screenshots were inspected; the phone overflow check passed. No actual spoken microphone check was performed.
