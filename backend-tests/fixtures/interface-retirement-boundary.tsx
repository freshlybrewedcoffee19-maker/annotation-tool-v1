// Only the data/auth/workspace boundary is replaced. All network access is blocked
// by the browser test; every query is handled in memory by its binding.
import type {ReactNode} from 'react';
export * from './v1-main-export-boundary';

export function WorkspaceProvider({children}:{children:ReactNode}){
 (window as any).workspaceProviderMounts=((window as any).workspaceProviderMounts??0)+1;
 return children;
}
