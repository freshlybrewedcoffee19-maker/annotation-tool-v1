const pending=[
 ['Assisted tracking','Follow a confirmed object through your own footage. Laptop and disappearance checks are still pending.'],
 ['Object detection','Suggest boxes for supported categories, then review them.'],
 ['Video masks','Follow object outlines through time, after laptop checks pass.'],
 ['Team review','Separate reviewer accounts, access permissions and disagreement checks.'],
];
export function PendingFeatures(){
 return <section className="pending-features" aria-label="Pending features"><h2>Pending features</h2><p>Not available yet</p>{pending.map(([name,description])=><details key={name}><summary><span>{name}</span><span className="pending-badge">Pending</span></summary><p>{description}</p></details>)}</section>;
}
