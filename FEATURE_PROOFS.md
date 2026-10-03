# Rebuild proof log

Approved order: 2, 8, 9, 10, 3, 7, 14, 12, 13, 15, 16, 4, 6, 1.

Each entry records browser output after uploading a short MP4 and using the feature. Each feature is committed, pushed and deployed before the next begins. Existing Convex saves and user-defined labels are preserved.

## Feature 2

```text
UPLOAD ACCEPTS: video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm
MOV PLAYED: true
WEBM PLAYED: true
SAMPLE EPISODE: sample.mp4
SAMPLE SEGMENT AFTER REFRESH: Opening | 0 | 1 | EditDelete
```

## Feature 8

```text
SPACE PLAYED: true
SPACE PAUSED: true
KEYBOARD MARKS: start=1.000; end=2.000
TYPING [ IN LABEL LIST: inserted text; start remained 1.000
SAVED SEGMENT: Opening | 1 | 2 | EditDelete
```

## Feature 9

```text
START AT ZERO: field=0; video=0
PREVIOUS END: field=1.250; video=1.25
AFTER REFRESH:
Opening | 0 | 1.25 | EditDelete
Opening | 1.25 | 2.5 | EditDelete
```

## Feature 10

```text
SEGMENT PREVIEW:
Start
1.250 sec
End
3.750 sec
Duration
2.500 sec
AFTER REFRESH: Opening | 1.25 | 3.75 | EditDelete
```

## Feature 3

```text
Video details
Filename
feature-3-1791053112546.mp4
File size
1,128,375 bytes
Format
video/mp4
Resolution
960 x 540
Duration
5.055 sec
VIDEO DETAILS AFTER REFRESH: unchanged
```

## Feature 7

```text
FPS: 25
VIDEO TIME: 2
Current frame: 50
Start frame: 25; End frame: 88
FPS AFTER REFRESH: 25
```

## Feature 14

```text
RECORD: Opening | 1 | 3 | ANN_001 | 2.000 | 25 | 75 | manual | EditDelete
EDIT + REFRESH: Opening | 1 | 3.5 | ANN_001 | 2.500 | 25 | 88 | manual | EditDelete
```

## Feature 12

```text
Coverage checks

Annotated: 2.000 sec (39.6%) · Unannotated: 3.055 sec

Coverage warning: review gaps or overlaps.

Gaps: 2.000–5.055 sec

Overlaps: 0.500–1.000 sec
AFTER REFRESH: same gaps and overlaps
```

## Feature 13

```text
GAP MARK: Gap: 2.000 to 5.055 sec
OVERLAP MARK: Overlap: 0.500 to 1.000 sec
TICKS: 0.00 sec
1.26 sec
2.53 sec
3.79 sec
5.05 sec
Selected: ANN_002 - Opening
VIEW SEGMENT VIDEO TIME: 0.5
TABLE + TIMELINE HIGHLIGHT: true
```

## Feature 15

```text
PARTIAL REVIEW:
Export review

1 saved segment(s) · Coverage: 19.8%

Coverage warning: 1 gap(s), 0 overlap(s). You can still export.

The header CSV and JSON keep their original four columns. Episode CSV adds IDs, duration, frames and source.

Export episode CSVAnnotate next video
COMPLETE REVIEW: Coverage pass: ready to export.
EPISODE CSV:
episode,annotation_id,label,start_sec,end_sec,duration_sec,start_frame,end_frame,source
"feature-15-1791053986419.mp4","ANN_001","Opening",0,1,1,"Not recorded","Not recorded","manual"
"feature-15-1791053986419.mp4","ANN_002","Opening",1,5.055,4.055,"Not recorded","Not recorded","manual"
Your segments stay saved. Upload another video when ready.
SAVED SEGMENTS AFTER NEXT VIDEO + REFRESH: 2
```

## Feature 16

```text
METADATA CSV:
episode,file_size_bytes,mime_type,duration_sec,width,height,frame_rate
"feature-16-1791054095402.mp4",1128375,"video/mp4",5.055,960,540,25
METADATA CSV AFTER REFRESH: identical
```

## Feature 4

```text
CUSTOM VALUES AFTER REFRESH: Location=Studio A; Session=Practice 1
METADATA CSV:
episode,file_size_bytes,mime_type,duration_sec,width,height,frame_rate,metadata.Location,metadata.Session
"feature-4-1791054250391.mp4",1128375,"video/mp4",5.055,960,540,"","Studio A","Practice 1"
SEGMENT PRESERVED: 1
ORIGINAL FIELD LIST RESTORED; saved values kept
```
