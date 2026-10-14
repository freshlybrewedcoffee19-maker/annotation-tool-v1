import {cronJobs} from 'convex/server';
import {internal} from './_generated/api';
const crons=cronJobs();
// Only expired temporary upload copies; saved videos remain untouched.
crons.interval('Clean expired R2 upload copies',{hours:1},internal.r2Cleanup.staging,{});
crons.interval('Clean expired feedback upload copies',{hours:1},internal.marketingFiles.cleanStaging,{});
crons.interval('Remove expired Trash',{hours:1},internal.trashCleanup.expired,{});
export default crons;
