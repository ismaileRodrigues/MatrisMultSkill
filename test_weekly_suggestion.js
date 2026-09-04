const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('/home/ubuntu/MatrisMultSkill/app.js','utf8');
const start=source.indexOf('function buildDaySuggestion'),end=source.indexOf('\nfunction renderSuggestionPreview',start);
const employees=[1,2,3,4].map(i=>({id:'e'+i,name:'E'+i}));
const operations=[1,2,3,4].map(i=>({id:'o'+i,code:'O'+i}));
const state={employees,operations,skills:{},linePlans:[{assignments:{},weeklySchedules:{}}],activeLineId:'line-1'};
for(const e of employees)for(const o of operations)state.skills[e.id+'|'+o.id]='titular';
const ctx={state,activePlan:()=>state.linePlans[0],isApto:v=>v==='titular'||v==='nivel_3',skill:(e,o)=>state.skills[e+'|'+o]||'sem_habilitacao',skillScore:v=>({titular:4,nivel_3:1}[v]??-1),WEEKDAYS:[['segunda','Segunda-feira'],['terca','Terça-feira'],['quarta','Quarta-feira'],['quinta','Quinta-feira'],['sexta','Sexta-feira']]};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const suggestion=ctx.buildDistributionSuggestion();if(suggestion.days.length!==5)throw Error('semana incompleta');
for(let i=0;i<suggestion.days.length;i++){const day=suggestion.days[i];if(day.assigned!==4)throw Error('cobertura incompleta em '+day.key);if(i>0){const previous=suggestion.days[i-1].assignments;for(const [opId,empId] of Object.entries(day.assignments))if(previous[opId]===empId)throw Error('step repetido em dias consecutivos para '+empId);}}
if(Object.keys(suggestion.weeklySchedules).length!==4)throw Error('weeklySchedules não preenchido');
console.log('OK sugestão semanal sem repetição consecutiva');
