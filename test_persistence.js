const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('/home/ubuntu/MatrisMultSkill/app.js','utf8');
const end=source.indexOf('\nfunction activePlan');
function boot(store){const ctx={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}},console};vm.createContext(ctx);vm.runInContext(source.slice(0,end)+'\nthis.__state=state;',ctx);return ctx;}
const payload={matrices:[{id:'table-1',name:'Tabela 1',employees:[{id:'e1',name:'Marlene'},{id:'e2',name:'Natan'}],operations:[{id:'o1',code:'07SM 2 D'},{id:'o2',code:'07SM 2 E'}],skills:{'e1|o1':'titular','e2|o2':'nivel_3'},linePlans:[{id:'line-1',name:'Linha 1',assignments:{o1:'e1',o2:'e2'},weeklySchedules:{e1:{segunda:'o1'},e2:{segunda:'o2'}}}],activeLineId:'line-1'}],activeMatrixId:'table-1'};
let ctx=boot({'matriz-multi-skill-local-v1':JSON.stringify(payload)});if(ctx.__state.employees.length!==2||ctx.__state.operations.length!==2||ctx.__state.skills['e1|o1']!=='titular'||ctx.__state.linePlans[0].weeklySchedules.e2.segunda!=='o2')throw Error('estado principal não restaurado');
ctx=boot({'matriz-multi-skill-local-v1':'{invalido','matriz-multi-skill-local-v1-backup':JSON.stringify(payload)});if(ctx.__state.employees.length!==2||ctx.__state.linePlans[0].assignments.o2!=='e2')throw Error('backup não restaurado');
console.log('OK persistência e restauração completa');
