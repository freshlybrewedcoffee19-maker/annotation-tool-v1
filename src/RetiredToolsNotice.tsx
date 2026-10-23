import './retired-tools.css';

export function RetiredToolsNotice(){
 return <p className="retired-tools-notice">Used the old drawing tools? <a href="mailto:riya.shah@cheddarvox.com">Email us</a> and we'll export your work.</p>;
}

export function RetiredToolsPage(){
 return <main className="retired-tools-page"><a className="brand" href="/">Cheddar Vox</a><h1>Video annotation</h1><RetiredToolsNotice/><a href="/">Continue to video annotation</a></main>;
}
