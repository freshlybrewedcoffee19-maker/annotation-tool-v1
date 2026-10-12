# The job

When temporal annotation is really time consuming and cumbersome, I want to just speak and have it recorded in a proper format, i.e. a sheet, so I can export a labelled dataset.

I am the founder of Cheddar Vox. I label robot demonstration videos myself. My garment manipulation dataset on Hugging Face was a 12-video ironing set. Even that small set took so long for temporal annotation that it caused fatigue: it got more cumbersome to label each video. A 45-second clip took me 30 minutes.

Another moment: while working in marketing, I had to share video changes with an editor. I marked start and stop on Clipchamp and added comments.

What I used:
- CVAT: manually clicking start and stop and adding a label.
- Clipchamp: marking video changes and adding comments.
- I still go back to CVAT for tracking-related work and object detection using AI.

# The switch

**Push:** Temporal annotation is really time consuming and cumbersome, and reviewing those annotations is also exhausting.

**Pull:** “What if I could just speak and it’s recorded in proper format, i.e. a sheet?” The design I’ve built in to review by swiping right and left is much better.

**Anxiety:** It was a smooth switch, to be honest. In product development, the latency had to be fixed so that the exact time when I say start and stop, I can mark it then and not have a lag. Cheddar Vox must mark the spoken boundaries without that delay.

**Habit:** I still return to CVAT for tracking-related work and object detection using AI. AI models for segmentation and tracking are parked for later in Cheddar Vox.

**The one worry onboarding must remove:** not known yet.

# The core flow

**CVAT: three described actions per segment**
1. Click on video.
2. Click again to stop.
3. From dropdown, select label.

No metadata involved. The full CVAT setup-to-export step count is not known yet.

**Cheddar Vox: three spoken actions per segment**
1. Say “start” into the mic.
2. Say “stop.”
3. Speak the label; the segment saves.

The described per-segment action count is three in both flows; clicking and selecting become speaking.

**My full Cheddar Vox session: 11 grouped steps**
1. Logged into my workspace.
2. Uploaded a video.
3. Four questions: add metadata.
4. Add labels: one question.
5. Opens workspace.
6. Picked Annotation from the panel.
7. Said “start” into the mic.
8. Said “stop.”
9. Said the label.
10. All labels saved; did review.
11. Export.

Metadata addition took the most time: adding the different camera angle, object, etc. details. Nothing with labelling; it helps me export the dataset with those details.

What must not happen:
- Start and stop must not have a lag.
- During review, the annotation must match the action in the video.
- The data extracted must match the one labelled—the columns, etc.

In my last reported session, start, stop and the spoken label did not save incorrectly.

**Other step-specific requirements:** not known yet.

# Onboarding

Sumit used the sample video. He signed in, turned on the mic, said “start” and “stop,” and spoke the label. He did it on his own.

The sample let him skip metadata setup and adding labels.

**First value:** Speak the label and the time segment saves itself.

**Login:** Happened before Sumit annotated the sample. This describes his test, not a confirmed rule for every current entry route.

**Smallest commitment required:** not known yet.

**The worry onboarding removes:** not known yet.

**Exact steps from opening the link to signing in:** not known yet.

**What we deliberately do not ask on day one:** not known yet.

# v1

I have used:
- Annotation.
- Object outlines.
- Visibility.
- Masks.
- Tracking.
- Review.
- Export.

I don’t have a voice-based workflow for object outlines, masks or tracking yet.

Parked:
- AI models for segmentation and tracking.
- Hand tracking or a voice flow for developing polygons/bounding boxes.

Free 1 GB storage for users.

**Nice-to-haves identified separately from parked work:** not known yet.

I only had one external user, Sumit Majumdar. He works as an AI data annotator and full stack developer at Uber Scaled Solutions.

In his first email, Sumit said he tested voice labelling and canvas tools using the sample clip, IRON_001_trial_45s.mp4. He reported:
- “almost negligible latency between speaking and the tag being rendered”;
- terms captured accurately without noticeable transcription errors;
- bounding boxes and polygon outlines alongside voice tags were useful;
- voice labelling felt significantly faster for rapid temporal tagging.

He did not time the comparison or report fewer missed actions.

He requested jump buttons for 5/10 seconds, exact timestamp entry, Undo/Redo buttons and shortcuts, and frame-by-frame navigation. In his second email, he took a quick look at the update and said the new player controls looked great. That was a quick look, not a full annotation test of the updated controls.

He had not tested his own video because of time constraints. He wrote: “I will definitely test it on one of my clips down the road.”

**Whether Sumit has returned to annotate his own video:** not known yet.

**The video or task he plans to annotate:** not known yet.

**The repeat behaviour that will count as v1 working:** not known yet.

Sumit explicitly permitted using the testimonial quote with his name when reaching out to teams. He suggested contacting Swapnil Narole and Prathamesh Gadve for insights or direction. These were suggested contacts, not direct introductions. I still have to reach out.

# The riskiest guess

I believed voice would help reduce fatigue. Labelling my 12-video ironing dataset got more cumbersome with each video. I thought: “What if I could just speak and it’s recorded in proper format, i.e. a sheet?”

**Founder timing comparison:** On the same 30-second video with the same labels, clicking took me 5 minutes and voice took me 1–2 minutes maximum. This time is for labelling only. Review and correction were not included, and I did not check both sets of timestamps for errors in that timing comparison.

**Founder fatigue and completeness comparison:** I labelled the same two videos manually first, then by voice two weeks later. My fatigue improved a lot; I felt stress free. I compared the Excel files. “Anchor”—when you hold the shirt and move the fabric—was in the voice-labelled file but missing from manual labelling. I didn’t mark anchor manually because I was exhausted and it was a small action. Since I didn’t have to click, I could just speak. Voice helped me improve dataset quality in this comparison.

I initially described this as dramatically improved timestamp accuracy. The specific evidence I described was a missed action captured with voice; timestamp precision was not measured.

Sumit’s feedback increased my confidence. His evidence remains separate: faster labelling was his impression, and he reported accurate speech recognition. He did not report fewer missed actions.

**Whether these benefits repeat for other users and longer sessions:** not known yet.

**Whether the whole task, including review and correction, is faster:** not known yet.

**Whether timestamp precision improves:** not known yet.

I did not test voice labelling without code before building.

**Thirty-minute no-code check:** not known yet.

**Result of that check:** not known yet.

# Milestones

1. I can make basic temporal annotations on action videos.
2. I can say “start,” “stop” and the label, and the segment saves.
3. I can use object outlines, visibility, masks and tracking, but I don’t have a voice-based workflow for outlines, masks or tracking yet.
4. I can review whether the annotation matches the action in the video.
5. I can export and check that the extracted data and columns match what I labelled.
6. I can close it, reopen it, and my data is still there.

I confirmed that my voice-labelled “anchor” was still saved in the workspace after reopening.
