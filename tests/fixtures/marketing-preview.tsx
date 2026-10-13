import React from 'react';
import {createRoot} from 'react-dom/client';
import {MarketingApp} from '../../src/marketing/MarketingApp';
import '../../src/trial-layout.css';
import '../../src/style.css';
import '../../src/flow.css';
import '../../src/brand.css';
import '../../src/editor-layout.css';
import '../../src/workspace-layout.css';
// Keep fixture state in browser memory while navigating; refreshing still resets it.
document.addEventListener('click',event=>{const anchor=(event.target as Element).closest('a');if(event.defaultPrevented||!anchor||anchor.target)return;const url=new URL(anchor.href);if(url.origin===location.origin&&url.pathname.startsWith('/marketing')){event.preventDefault();history.pushState(null,'',url.pathname);dispatchEvent(new PopStateEvent('popstate'));}});
createRoot(document.getElementById('root')!).render(<React.StrictMode><MarketingApp/></React.StrictMode>);
