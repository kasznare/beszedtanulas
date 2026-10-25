const objectIds = ['alma','labda','auto'];
const modes = ['count','quiz'];
const counter = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
export function normalizeNumberSettings(value = {}) {
  return { numberSelf: value.numberSelf === true, numberLayout: value.numberLayout === 'scattered' ? 'scattered' : 'rows', quizDifficulty: value.quizDifficulty === 'close' ? 'close' : 'wide' };
}
export function buildNumberChoices(target, limit, difficulty = 'wide', random = Math.random) {
  const values = Array.from({length:limit},(_,i)=>i+1).filter(n=>n!==target);
  let choices;
  if(difficulty==='close'){
    const ranked = values.map(n=>({n,tie:random()})).sort((a,b)=>(Math.abs(a.n-target)-Math.abs(b.n-target)) || a.tie-b.tie);
    choices=[target,...ranked.slice(0,2).map(x=>x.n)];
  }else{
    // "Két különböző": any clearly different amount (at least two apart), not always the farthest one.
    const far=values.filter(n=>Math.abs(n-target)>=2), pool=far.length?far:values;
    choices=[target,pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]];
  }
  for(let i=choices.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[choices[i],choices[j]]=[choices[j],choices[i]];}
  return choices;
}
export const NUMBER_OBJECTS = objectIds;
export const nextNumberObject = id => objectIds[(objectIds.indexOf(id)+1)%objectIds.length];
// Amounts the child has not yet counted alone, or needed help with, come up more often.
export function numberWeights(stats = {}, limit = 3) {
  return Array.from({length:limit},(_,i)=>{const record=stats?.[i+1]||{};return {n:i+1,weight:(1+Math.min(counter(record.helped),4))/(1+Math.min(counter(record.independent),6))};});
}
export function pickNumberAmount(stats, limit, previous = 0, random = Math.random) {
  const options=numberWeights(stats,limit).filter(({n})=>n!==previous);
  let roll=random()*options.reduce((sum,{weight})=>sum+weight,0);
  for(const {n,weight} of options){roll-=weight;if(roll<0)return n;}
  return options.at(-1).n;
}
// Two clean answers in a row bring three similar pictures; two missed ones bring back two different ones.
export function updateQuizDifficulty(difficulty, streak = {}, clean = true) {
  let {clean:good=0,missed=0}=streak;
  if(clean){good++;missed=0;}else{missed++;good=0;}
  if(difficulty==='wide'&&good>=2)return {difficulty:'close',streak:{clean:0,missed:0}};
  if(difficulty==='close'&&missed>=2)return {difficulty:'wide',streak:{clean:0,missed:0}};
  return {difficulty,streak:{clean:good,missed}};
}
export function numberStars(clean, total) {
  if(!total)return 1;
  return Math.min(5,Math.max(1,Math.round(5*Math.min(counter(clean),total)/total)));
}
export function newNumberSession(mode, limit, length = 5, previous = 0, random = Math.random, stats = null, objectId = 'alma') {
  return { mode, limit, length:[3,5,10].includes(length)?length:5, completed:0, clean:0, rewarded:false,
    amount:pickNumberAmount(stats||{},limit,previous,random),
    objectId:objectIds.includes(objectId)?objectId:'alma', counted:[], choices:[], solved:false, misses:0, helped:false };
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
    // In self counting the total is asked after the last object: those choices wait only on a fully counted task.
    const answerable=mode==='quiz'||counted.length===s.amount;
    result.sessions[mode]={mode,limit:s.limit,length:s.length,completed,rewarded:s.rewarded===true&&completed===s.length,
      amount:s.amount,objectId:s.objectId,counted,choices:answerable&&choices.includes(s.amount)?choices:[],solved:s.solved===true&&(mode==='quiz'||counted.length===s.amount),misses:counter(s.misses),helped:s.helped===true,clean:Math.min(completed,counter(s.clean))};
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
    if(s.clean!==undefined&&(!validCounter(s.clean)||s.clean>s.completed))fail();
    if(mode==='count'&&(s.solved&&s.counted.length!==s.amount||s.choices.length&&(s.counted.length!==s.amount||![2,3].includes(s.choices.length)||!s.choices.includes(s.amount))||!s.solved&&s.counted.length===s.amount&&!s.choices.length))fail();
    if(mode==='quiz'&&(s.counted.length||![2,3].includes(s.choices.length)||!s.choices.includes(s.amount)))fail();
    if(s.solved&&s.completed===0||s.rewarded!==(s.completed===s.length)||s.rewarded&&!s.solved)fail();
  }
}
