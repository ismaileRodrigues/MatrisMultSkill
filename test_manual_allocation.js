const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('/home/ubuntu/MatrisMultSkill/app.js','utf8');
const start=source.indexOf('function openAssignModal'),end=source.indexOf('\nfunction rotateAssignments',start);
const state={employees:[{id:'e1',name:'Marlene'},{id:'e2',name:'Natan'}],operations:[{id:'o1',code:'Step 1'},{id:'o2',code:'Step 2'}],skills:{'e1|o1':'titular','e1|o2':'titular','e2|o1':'titular'},linePlans:[{id:'line-1',name:'Linha 1',assignments:{o1:'e1'},weeklySchedules:{e1:{},e2:{}}}],activeLineId:'line-1'};
const ctx={state,activePlan:()=>state.linePlans[0],currentWeekday:()=> 'segunda',isApto:v=>v==='titular'||v==='nivel_3',skill:(e,o)=>state.skills[e+'|'+o]||'sem_habilitacao',save:()=>true,renderLineBoard:()=>{},flash:()=>{},levelInfo:v=>[v,v],escapeHtml:s=>s};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
ctx.assign('o2','e1');if(state.linePlans[0].assignments.o2!=='e1'||state.linePlans[0].assignments.o1)throw Error('realocação manual falhou');if(state.linePlans[0].weeklySchedules.e1.segunda!=='o2')throw Error('programação diária não salva');
console.log('OK alocação manual e realocação persistente');
