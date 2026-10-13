const objectIds = ['alma','labda','auto'];
const modes = ['count','quiz'];
const counter = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
export function normalizeNumberSettings(value = {}) {
  return { numberSelf: value.numberSelf === true, numberLayout: value.numberLayout === 'scattered' ? 'scattered' : 'rows', quizDifficulty: value.quizDifficulty === 'close' ? 'close' : 'wide' };
}
export function buildNumberChoices(target, limit, difficulty = 'wide', random = Math.random) {
  const values = Array.from({length:limit},(_,i)=>i+1).filter(n=>n!==target);
  const ranked = values.map(n=>({n,tie:random()})).sort((a,b)=>(difficulty==='close'?1:-1)*(Math.abs(a.n-target)-Math.abs(b.n-target)) || a.tie-b.tie);
  const choices=[target,...ranked.slice(0,difficulty==='close'?2:1).map(x=>x.n)];
  for(let i=choices.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[choices[i],choices[j]]=[choices[j],choices[i]];}
  return choices;
}
export function newNumberSession(mode, limit, length = 5, previous = 0, random = Math.random) {
  const candidates=Array.from({length:limit},(_,i)=>i+1).filter(n=>n!==previous);
  return { mode, limit, length:[3,5,10].includes(length)?length:5, completed:0, rewarded:false,
    amount:mode==='count'?Math.min(3,limit):candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))],
    objectId:'alma', counted:[], choices:[], solved:false, misses:0, helped:false };
}
export function normalizeNumberProgress(value = {}) {
  const result={stats:{count:{},quiz:{}},sessions:{}};
  for(const mode of modes){
    for(let amount=1;amount<=10;amount++){
      const old=value?.stats?.[mode]?.[amount];
      result.stats[mode][amount]={independent:counter(old?.independent),helped:counter(old?.helped)};
    }
    const s=value?.sessions?.[mode];
    if(!s || ![3,5,10].includes(s.limit) || ![3,5,10].includes(s.length) || !Number.isInteger(s.amount) || s.amount<1 || s.amount>s.limit || !objectIds.includes(s.objectId))continue;
    const counted=[...new Set(Array.isArray(s.counted)?s.counted.filter(n=>Number.isInteger(n)&&n>=0&&n<s.amount):[])];
    const choices=[...new Set(Array.isArray(s.choices)?s.choices.filter(n=>Number.isInteger(n)&&n>=1&&n<=s.limit):[])].slice(0,3);
    const completed=Math.min(s.length,counter(s.completed));
    result.sessions[mode]={mode,limit:s.limit,length:s.length,completed,rewarded:s.rewarded===true&&completed===s.length,
      amount:s.amount,objectId:s.objectId,counted,choices:choices.includes(s.amount)?choices:[],solved:s.solved===true&&(mode==='quiz'||counted.length===s.amount),misses:counter(s.misses),helped:s.helped===true};
    try { validateNumberProgress(result); } catch { delete result.sessions[mode]; }
  }
  return result;
}
export function validateNumberProgress(value) {
  if(value===undefined)return;
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const validCounter=n=>Number.isSafeInteger(n)&&n>=0;
  const fail=()=>{throw Error('A számjáték mentése hibás.');};
  if(!object(value)||!object(value.stats)||!object(value.sessions))fail();
  for(const key of [...Object.keys(value.stats),...Object.keys(value.sessions)])if(!modes.includes(key))fail();
  for(const mode of modes){
    if(!object(value.stats[mode]))fail();
    for(const [amount,record] of Object.entries(value.stats[mode])){
      if(!/^(?:[1-9]|10)$/.test(amount)||!object(record)||!validCounter(record.independent)||!validCounter(record.helped))fail();
    }
    const s=value.sessions[mode];
    if(s===undefined)continue;
    if(!object(s)||s.mode!==mode||![3,5,10].includes(s.limit)||![3,5,10].includes(s.length)||!Number.isInteger(s.amount)||s.amount<1||s.amount>s.limit||!objectIds.includes(s.objectId))fail();
    if(!validCounter(s.completed)||s.completed>s.length||!validCounter(s.misses)||typeof s.solved!=='boolean'||typeof s.rewarded!=='boolean'||typeof s.helped!=='boolean')fail();
    if(!Array.isArray(s.counted)||new Set(s.counted).size!==s.counted.length||s.counted.some(n=>!Number.isInteger(n)||n<0||n>=s.amount))fail();
    if(!Array.isArray(s.choices)||new Set(s.choices).size!==s.choices.length||s.choices.some(n=>!Number.isInteger(n)||n<1||n>s.limit))fail();
    if(mode==='count'&&(s.choices.length||s.solved!==(s.counted.length===s.amount)))fail();
    if(mode==='quiz'&&(s.counted.length||![2,3].includes(s.choices.length)||!s.choices.includes(s.amount)))fail();
    if(s.solved&&s.completed===0||s.rewarded!==(s.completed===s.length)||s.rewarded&&!s.solved)fail();
  }
}
