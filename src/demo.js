// No credentials, no API, no emailing: deterministic smoke test of basic ranking/filter logic.
const profile = {verifiedSkills:['SQL','databases','Excel','Word','PowerPoint','student support'],maxRequiredYears:1};
const input = [
  {company:'Sample City',title:'Data Entry Assistant',location:'Los Angeles, CA',years:0,skills:['Excel'],url:'https://example.org/jobs/100'},
  {company:'Sample City',title:'Data Entry Assistant',location:'Los Angeles, CA',years:0,skills:['Excel'],url:'https://example.org/jobs/100'},
  {company:'Example Firm',title:'Senior Data Scientist',location:'California',years:5,skills:['Python'],url:'https://example.org/jobs/101'},
  {company:'Example University',title:'Program Operations Intern',location:'California',years:0,skills:['Excel','student support'],url:'https://example.org/jobs/102'}
];
const seen=new Set();
const jobs=input.filter(j => {if(j.years > profile.maxRequiredYears || seen.has(j.url))return false;seen.add(j.url);return true;})
 .map(j=>({...j,score:Math.min(100,50+j.skills.filter(s=>profile.verifiedSkills.includes(s)).length*15)}))
 .sort((a,b)=>b.score-a.score);
return [{json:{demoOnly:true,message:'Sample employers are fictional. No job has been verified or applied to.',jobs}}];
