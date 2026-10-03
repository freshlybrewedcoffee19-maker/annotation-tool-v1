// Display aliases only: saved names and export values stay unchanged.
export function displayLabel(label:string,trial:boolean){return trial?label.replaceAll('_',' '):label;}
