const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function run(file, context) {
  const source=fs.readFileSync(path.join(root,'src',file),'utf8');
  return vm.runInNewContext(`(function(){${source}\n})()`,{Buffer,URL,Date,...context},{timeout:2500});
}
const sampleAlert={id:'m1',payload:{headers:[{name:'Subject',value:'An internship alert'},{name:'From',value:'jobs@example.org'}],mimeType:'multipart/alternative',parts:[{mimeType:'text/plain',body:{data:Buffer.from('Data Analyst Intern in Irvine. https://example.org/jobs/123').toString('base64url')}}]}};
const prepared=run('prepare.js',{$input:{all:()=>[{json:sampleAlert}]}})[0].json;
assert.equal(prepared.alerts.length,1);
assert.equal(prepared.alerts[0].subject,'An internship alert');
assert(prepared.alerts[0].urls.includes('https://example.org/jobs/123'));
assert(!prepared.profile.verifiedSkills.includes('Power BI'));
const source={...prepared,recipient:'test@example.org'};
const fakeJobs=[{title:'Data Analyst Intern',company:'Example Co',url:'https://example.org/jobs/123',requiredYears:0,score:80,whyFit:'SQL',gaps:[],resumeSuggestions:['Emphasize SQL coursework']},
{title:'Fake',company:'Bad Co',url:'https://evil.example/apply',requiredYears:0,score:100},
{title:'Data Analyst Intern',company:'Example Co',url:'https://example.org/jobs/123',requiredYears:0,score:80},
{title:'Senior',company:'Example Co',url:'https://example.org/jobs/123',requiredYears:4}];
const state={};
const evalResult={choices:[{message:{content:JSON.stringify({jobs:fakeJobs})}}]};
const digest=run('digest.js',{$input:{first:()=>({json:evalResult})},$:(name)=>({first:()=>({json:source})}),$getWorkflowStaticData:()=>state})[0].json;
assert.equal(digest.jobs.length,1,'untrusted and duplicate and overqualified jobs are removed');
assert.equal(digest.newKeys.length,1);
assert.equal(Object.keys(state).length,0,'do not mark as sent until Gmail succeeds');
run('mark-sent.js',{$:()=>({first:()=>({json:digest})}),$getWorkflowStaticData:()=>state});
assert.equal(Object.keys(state.sentJobKeys).length,1);
const second=run('digest.js',{$input:{first:()=>({json:evalResult})},$:(name)=>({first:()=>({json:source})}),$getWorkflowStaticData:()=>state})[0].json;
assert.equal(second.jobs.length,0,'subsequent live runs suppress already sent jobs');
const failure=run('digest.js',{$input:{first:()=>({json:{error:{message:'API unavailable'}}})},$:(name)=>({first:()=>({json:source})}),$getWorkflowStaticData:()=>({})})[0].json;
assert.equal(failure.jobs.length,0);
assert(failure.message.includes('OpenAI request failed'));
const demo=run('demo.js',{})[0].json;
assert.equal(demo.jobs.length,2);
for(const f of ['jarvis-job-hunter.json','jarvis-offline-demo.json']) {
 const flow=JSON.parse(fs.readFileSync(path.join(root,'workflows',f),'utf8'));
 const names=new Set(flow.nodes.map(n=>n.name));
 for(const [a,outputs] of Object.entries(flow.connections)) {assert(names.has(a));for(const lane of outputs.main) for(const v of lane)assert(names.has(v.node));}
 assert.equal(flow.active,false);
 assert(flow.nodes.every(n=>!n.credentials));
}
console.log('PASS: 12+ assertions covering parsing, verified skill hygiene, URL allowlist, experience limits, de-duplication, failure report, demo, workflow graph, credential hygiene.');
