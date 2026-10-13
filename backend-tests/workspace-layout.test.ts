import {test,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {WorkspaceLayout} from '../src/WorkspaceLayout';
import {MediaNavigation} from '../src/MediaNavigation';

test('the normal annotation workspace keeps its full tools and file controls',()=>{
 const frame=renderToStaticMarkup(createElement(WorkspaceLayout,{activity:'actions',collapsed:false,toggle:()=>{},title:'Annotation tool',children:null}));
 for(const tool of ['Annotation','Outlines','Visibility','Relations','Masks','Tracking','Review','Export'])expect(frame).toContain(`>${tool}</span>`);
 expect(frame).toContain('Collapse tool controls');
 const navigation=renderToStaticMarkup(createElement(MediaNavigation,{files:[{_id:'video-1',name:'Original video'}],selected:'video-1',choose:()=>{},disabled:false}));
 expect(navigation).toContain('Current media file');expect(navigation).toContain('Previous file');expect(navigation).toContain('Next file');
});

test('marketing reuses the frame with only its relevant tools without changing defaults',()=>{
 const frame=renderToStaticMarkup(createElement(WorkspaceLayout,{activity:'actions',collapsed:false,toggle:()=>{},title:'Video feedback',children:null,toolItems:['actions','review','export'],toolLabels:{actions:'Feedback',export:'Share'}}));
 expect(frame).toContain('workspace-frame');expect(frame).toContain('>Feedback</span>');expect(frame).toContain('>Share</span>');expect(frame).not.toContain('>Masks</span>');
});
