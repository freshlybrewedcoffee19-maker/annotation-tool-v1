export const RECENT_PROJECT_WINDOW=24*60*60*1000;
export function shouldOfferContinue(savedAt:number,now=Date.now()){return Number.isFinite(savedAt)&&savedAt<=now&&now-savedAt<RECENT_PROJECT_WINDOW;}
