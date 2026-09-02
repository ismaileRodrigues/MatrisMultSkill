const fs=require('fs'),vm=require('vm');
const s=fs.readFileSync('/home/ubuntu/MatrisMultSkill/app.js','utf8');
const a=s.indexOf('function rotateAssignments(){'),b=s.indexOf('\nfunction maybeRunScheduledRotation',a);
const employees=[1,2,3,4].map(i=>({id:'e'+i,name:'E'+i}));
const operations=[1,2,3,4].map(i=>({id:'o'+i,code:'O'+i}));
const ctx={Math,Set,Map,Object,Array,Date,state:{employees,operations,skills:{},linePlans:[{assignments:{o1:'e1',o2:'e2',o3:'e3',o4:'e4'},rotationRoutes:{},rotationState:{}}]},isApto:v=>v==='titular'||v==='nivel_3',skill:(e,o)=>ctx.state.skills[e+'|'+o]||'sem_habilitacao',routeFor:e=>operations.map(o=>o.id),skillScore:v=>({titular:4,nivel_3:1}[v]??-1),today:()=> '2026-09-02',activePlan:()=>ctx.state.linePlans[0]};
for(const e of employees)for(const o of operations)ctx.state.skills[e.id+'|'+o.id]='titular';
vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
for(let i=0;i<10;i++){const r=ctx.rotateAssignments();const vals=Object.values(ctx.state.linePlans[0].assignments);if(r.assigned!==4||new Set(vals).size!==4)throw Error('cobertura falhou na rodada '+i+': '+JSON.stringify(r));}
console.log('OK cobertura máxima em 10 rotações');
