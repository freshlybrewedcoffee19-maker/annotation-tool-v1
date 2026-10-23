import type {Activity} from './ActivityNavigation';

// Interface retirement only. Stored drawings and their backend functions stay intact.
export const VIDEO_ACTIVITIES:Activity[]=['actions','review','export'];
export function videoActivity(value:string|null|undefined):Activity{
 return VIDEO_ACTIVITIES.includes(value as Activity)?value as Activity:'actions';
}
