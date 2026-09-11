const KEY = 'matriz-multi-skill-local-v1';
const BACKUP_KEY = 'matriz-multi-skill-local-v1-backup';
const levels = [['titular','Titular','T'],['nivel_1','Nível 1','N1'],['nivel_2','Nível 2','N2'],['nivel_3','Nível 3','N3'],['formacao_planejada','Formação planejada','FP'],['sem_habilitacao','Sem habilitação','—']];
const WEEKDAYS = [['segunda','Segunda-feira'],['terca','Terça-feira'],['quarta','Quarta-feira'],['quinta','Quinta-feira'],['sexta','Sexta-feira']];
const defaultEmployees = ['Marlene','Natan','Cassiane','Ronald','Alisson','Izabele','Ivana','Maria Eduarda','Anderson Santos','Jeisse','Marcia Souza','Marcia Seguro','Richard','Maria','Larissa','Alisson Douglas','Francieli'];
const defaultOperations = ['07SM 11 D','07SM 11 E','07SM 12 D','07SM 12 E','07SM 13','07SM 14','07SM 15','07SM 16','07SM 50','07SM 51','07SM 52 1','07SM 52 2','07SM 53'];
const titularMap = {'07SM 11 D':'Marlene','07SM 11 E':'Natan','07SM 12 D':'Cassiane','07SM 12 E':'Alisson','07SM 13':'Anderson Santos','07SM 14':'Maria Eduarda','07SM 15':'Ivana','07SM 16':'Jeisse','07SM 50':'Maria','07SM 51':'Izabele','07SM 52 1':'Marcia Souza','07SM 52 2':'Richard','07SM 53':'Larissa'};
let state = load(); let modalMode = null; let modalId = null; let draggedRoute = null; let pendingSuggestion = null;
function blankPlan(id, name){ return {id, name, mode:'manual', frequency:'daily', scheduledDate:'', assignments:{}, lastRun:'', rotationRoutes:{}, weeklySchedules:{}, rotationState:{}}; }
function migratePlan(p, i=0){ const plan = {...blankPlan(p?.id || 'line-'+(i+1), p?.name || 'Linha '+(i+1)), ...(p||{})}; plan.assignments = {...(p?.assignments||{})}; plan.rotationRoutes = {...(p?.rotationRoutes||{})}; plan.weeklySchedules = {...(p?.weeklySchedules||{})}; plan.rotationState = {...(p?.rotationState||{})}; delete plan.history; return plan; }
function matrixFromState(source={},id,name){
  const employees=(Array.isArray(source.employees)?source.employees:[]).filter(e=>e&&e.id!=null&&e.name!=null).map(e=>({...e,id:String(e.id),name:String(e.name)}));
  const operations=(Array.isArray(source.operations)?source.operations:[]).filter(o=>o&&o.id!=null&&o.code!=null).map(o=>({...o,id:String(o.id),code:String(o.code)}));
  const eids=new Set(employees.map(e=>e.id)), oids=new Set(operations.map(o=>o.id));
  const skills={};
  Object.entries(source.skills&&typeof source.skills==='object'?source.skills:{}).forEach(([key,value])=>{const [eid,oid]=key.split('|');if(eids.has(eid)&&oids.has(oid)&&levels.some(l=>l[0]===value))skills[eid+'|'+oid]=value;});
  const rawPlans=Array.isArray(source.linePlans)&&source.linePlans.length?source.linePlans:[source.linePlan];
  const linePlans=(rawPlans.filter(Boolean).length?rawPlans.filter(Boolean):[blankPlan('line-1','Linha 1')]).map((p,i)=>{const plan=migratePlan(p,i);const assignments={};Object.entries(plan.assignments||{}).forEach(([oid,eid])=>{if(oids.has(String(oid))&&eids.has(String(eid)))assignments[String(oid)]=String(eid);});plan.assignments=assignments;Object.keys(plan.rotationRoutes||{}).forEach(eid=>{plan.rotationRoutes[eid]=(Array.isArray(plan.rotationRoutes[eid])?plan.rotationRoutes[eid]:[]).map(String).filter(oid=>oids.has(oid));});
    const weekly={};Object.entries(plan.weeklySchedules||{}).forEach(([eid,schedule])=>{if(!eids.has(String(eid))||!schedule||typeof schedule!=='object')return;weekly[String(eid)]={};WEEKDAYS.forEach(([day])=>{const oid=String(schedule[day]||'');if(oids.has(oid))weekly[String(eid)][day]=oid;});});plan.weeklySchedules=weekly;return plan;});
  return {id:String(id),name:String(name),employees,operations,skills,linePlans,activeLineId:linePlans.some(p=>p.id===source.activeLineId)?source.activeLineId:linePlans[0].id};
}
function activateMatrix(id){const matrix=state.matrices.find(m=>m.id===id)||state.matrices[0];if(!matrix)return;state.activeMatrixId=matrix.id;state.employees=matrix.employees;state.operations=matrix.operations;state.skills=matrix.skills;state.linePlans=matrix.linePlans;state.activeLineId=matrix.activeLineId||matrix.linePlans[0].id;}
function syncCurrentMatrix(){if(!state?.matrices)return;const matrix=state.matrices.find(m=>m.id===state.activeMatrixId);if(!matrix)return;matrix.employees=state.employees;matrix.operations=state.operations;matrix.skills=state.skills;matrix.linePlans=state.linePlans;matrix.activeLineId=state.activeLineId;}
function createDefaultState(){
  const employees=defaultEmployees.map((name,i)=>({id:'e'+i,name}));const operations=defaultOperations.map((code,i)=>({id:'o'+i,code}));const skills={};
  operations.forEach(o=>{const emp=employees.find(e=>e.name===titularMap[o.code]);if(emp)skills[emp.id+'|'+o.id]='titular';});
  const first={employees,operations,skills,linePlans:[blankPlan('line-1','Linha 1')],activeLineId:'line-1'};const matrix=matrixFromState(first,'table-1','Tabela 1');return {...matrix,matrices:[matrix],activeMatrixId:matrix.id};
}
function stateFromSaved(saved){
  if(!saved||typeof saved!=='object')return null;
  const rawMatrices=Array.isArray(saved.matrices)&&saved.matrices.length?saved.matrices:[saved];
  const matrices=rawMatrices.map((m,i)=>matrixFromState(m,m?.id||'table-'+(i+1),m?.name||'Tabela '+(i+1))).filter(m=>m.employees.length&&m.operations.length);
  if(!matrices.length)return null;
  const activeId=matrices.some(m=>m.id===String(saved.activeMatrixId))?String(saved.activeMatrixId):matrices[0].id;const first=matrices.find(m=>m.id===activeId)||matrices[0];
  return {matrices,activeMatrixId:first.id,employees:first.employees,operations:first.operations,skills:first.skills,linePlans:first.linePlans,activeLineId:first.activeLineId};
}
function readStoredState(key){try{const raw=localStorage.getItem(key);return raw?stateFromSaved(JSON.parse(raw)):null;}catch(error){console.warn('Registro local inválido em '+key,error);return null;}}
function load(){
  const restored=readStoredState(KEY)||readStoredState(BACKUP_KEY);
  if(restored)return restored;
  return createDefaultState();
}
function save(){
  try{syncCurrentMatrix();const serialized=JSON.stringify(state);localStorage.setItem(BACKUP_KEY,serialized);localStorage.setItem(KEY,serialized);return true;}catch(error){console.error('Falha ao persistir o estado:',error);flash('Não foi possível salvar as alterações neste navegador');return false;}
}
function activePlan(){ return state.linePlans.find(l=>l.id===state.activeLineId) || state.linePlans[0]; }
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function levelInfo(v){ return levels.find(x=>x[0]===v)||levels[5]; }
function skill(e,o){ return state.skills[e+'|'+o]||'sem_habilitacao'; }
function isApto(value){return value==='titular'||value==='nivel_3';}
function coverageEmployee(id){ return state.operations.filter(o=>isApto(skill(id,o.id))).length; }
function coverageOperation(id){ return state.employees.filter(e=>isApto(skill(e.id,id))).length; }
function today(){ return new Date().toISOString().slice(0,10); }
function currentWeekday(){const day=new Date().getDay();return ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][day];}
function scheduledOperationFor(empId,day=currentWeekday()){return activePlan().weeklySchedules?.[empId]?.[day]||'';}
function assignmentsForDay(plan,day){
  const result={};const usedEmployees=new Set();const usedOperations=new Set();
  state.employees.forEach(emp=>{const opId=plan.weeklySchedules?.[emp.id]?.[day];if(!opId||usedEmployees.has(emp.id))return;const op=state.operations.find(o=>o.id===opId);if(op&&isApto(skill(emp.id,op.id))&&!usedOperations.has(op.id)){result[op.id]=emp.id;usedEmployees.add(emp.id);usedOperations.add(op.id);}});
  Object.entries(plan.assignments||{}).forEach(([opId,empId])=>{if(usedOperations.has(opId)||usedEmployees.has(empId))return;const op=state.operations.find(o=>o.id===opId);const emp=state.employees.find(e=>e.id===empId);if(op&&emp&&isApto(skill(emp.id,op.id))){result[opId]=empId;usedOperations.add(opId);usedEmployees.add(empId);}});
  return result;
}
function assignmentsForToday(plan){return assignmentsForDay(plan,currentWeekday());}
function weeklyValidation(plan,empId,day,opId){
  if(opId){const conflict=state.employees.find(emp=>emp.id!==empId&&plan.weeklySchedules?.[emp.id]?.[day]===opId);if(conflict)return `O step já está programado para ${conflict.name} na ${WEEKDAYS.find(([key])=>key===day)?.[1]||day}.`;
    const employeeConflict=plan.weeklySchedules?.[empId]?.[day]&&plan.weeklySchedules[empId][day]!==opId; if(employeeConflict)return 'Este funcionário já possui outro step programado para o mesmo dia.';}
  const before=assignmentsForDay(plan,day);const candidate=JSON.parse(JSON.stringify(plan));candidate.weeklySchedules=candidate.weeklySchedules||{};candidate.weeklySchedules[empId]=candidate.weeklySchedules[empId]||{};if(opId)candidate.weeklySchedules[empId][day]=opId;else delete candidate.weeklySchedules[empId][day];const after=assignmentsForDay(candidate,day);
  if(Object.keys(before).length===state.operations.length&&Object.keys(after).length<state.operations.length){const missing=state.operations.filter(op=>!after[op.id]).map(op=>op.code).join(', ');return `A alteração deixaria step(s) sem operador: ${missing}.`;}return '';
}

function renderMatrixSelector(){const el=document.querySelector('#matrixSelect');if(el)el.innerHTML=state.matrices.map(m=>`<option value="${m.id}" ${m.id===state.activeMatrixId?'selected':''}>${escapeHtml(m.name)}</option>`).join('');}
function render(){ maybeRunScheduledRotation(); renderMatrixSelector(); const total=state.employees.length*state.operations.length; const covered=state.employees.reduce((a,e)=>a+coverageEmployee(e.id),0); const planned=Object.values(state.skills).filter(x=>x==='formacao_planejada').length;
  document.querySelector('#stats').innerHTML=[['Cobertura geral',total?Math.round(covered/total*100)+'%':'0%',`${covered} de ${total} posições`,'▦'],['Funcionários',state.employees.length,'pessoas na matriz','♙'],['Operações',state.operations.length,'postos acompanhados','↕'],['Formações planejadas',planned,'pontos de atenção','⌂']].map(x=>`<div class="stat"><span class="stat-label">${x[0]}</span><div class="stat-value">${x[1]}</div><span class="stat-helper">${x[2]}</span></div>`).join('');
  const query=(document.querySelector('#searchInput')?.value||'').toLowerCase(); const emps=state.employees.filter(e=>e.name.toLowerCase().includes(query)); let html='<thead><tr><th>Funcionário</th>'+state.operations.map(o=>`<th><button class="operation-head" data-edit-operation="${o.id}">${escapeHtml(o.code)} ✎</button><div>${coverageOperation(o.id)} aptos <button class="operation-delete" data-delete-operation="${o.id}" title="Remover">×</button></div></th>`).join('')+'<th>Cobertura</th></tr></thead><tbody>';
  html += emps.map(e=>`<tr><td><span class="initials">${e.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><button class="employee-name" data-edit-employee="${e.id}">${escapeHtml(e.name)}</button><button class="employee-delete" data-delete-employee="${e.id}" title="Remover">×</button></td>${state.operations.map(o=>{const v=skill(e.id,o.id);return `<td><select class="cell-select ${v}" data-employee="${e.id}" data-operation="${o.id}">${levels.map(l=>`<option value="${l[0]}" ${l[0]===v?'selected':''}>${l[1]}</option>`).join('')}</select></td>`}).join('')}<td class="coverage ${coverageEmployee(e.id)<Math.ceil(state.operations.length/2)?'low':'ok'}">${coverageEmployee(e.id)}/${state.operations.length}</td></tr>`).join(''); html+='</tbody>'; document.querySelector('#matrixTable').innerHTML=html; document.querySelector('#legend').innerHTML=levels.map(l=>`<span><b class="${l[0]}">${l[2]}</b>${l[1]}</span>`).join(''); renderSummaries(emps); bindMatrixEvents(); }
function renderSummaries(emps){ document.querySelector('#employeeSummary').innerHTML=emps.slice(0,8).map(e=>bar(e.name,coverageEmployee(e.id),state.operations.length)).join('')||'<p class="local-note">Nenhum funcionário encontrado.</p>'; document.querySelector('#operationSummary').innerHTML=state.operations.slice(0,8).map(o=>bar(o.code,coverageOperation(o.id),state.employees.length)).join(''); renderLineBoard(); }
function bar(label,value,total){const pct=total?Math.round(value/total*100):0;return `<div class="summary-item"><div class="summary-line"><span>${escapeHtml(label)}</span><strong class="${pct<50?'low':'ok'}">${value}/${total}</strong></div><div class="bar"><i class="${pct<50?'warning':''}" style="width:${pct}%"></i></div></div>`;}
function renderLineBoard(){ const plan=activePlan(); if(!plan)return; const displayedAssignments=assignmentsForToday(plan); const board=document.querySelector('#lineBoard'); const banner=document.querySelector('#rotationBanner'); const lineSelect=document.querySelector('#lineSelect'); if(lineSelect)lineSelect.innerHTML=state.linePlans.map(l=>`<option value="${l.id}" ${l.id===plan.id?'selected':''}>${escapeHtml(l.name)}</option>`).join(''); document.querySelector('#rotationDate').value=plan.scheduledDate||''; document.querySelector('#rotationFrequency').value=plan.frequency||'daily'; document.querySelector('#rotationMode').value=plan.mode||'manual';
  const currentDay=today(); if(plan.mode==='automatic'&&plan.scheduledDate){ if(plan.lastRun===currentDay) banner.innerHTML=`Rotação automática executada hoje. Próxima execução prevista para: <strong>${plan.scheduledDate}</strong>`; else if(currentDay>=plan.scheduledDate) banner.innerHTML=`<strong>Atenção:</strong> A data programada (${plan.scheduledDate}) venceu. A rotação será executada automaticamente.`; else banner.innerHTML=`Próxima rotação automática agendada para: <strong>${plan.scheduledDate}</strong>`; } else banner.innerHTML='Modo manual ativo. A rotação não ocorrerá automaticamente.'; if(plan.lastRotation) banner.innerHTML+=`<br><span class="rotation-summary">Última rotação: <strong>${plan.lastRotation.assigned}/${plan.lastRotation.total}</strong> steps alocados${plan.lastRotation.assigned<plan.lastRotation.total?' · não foi possível cobrir todos os steps com a equipe apta atual.':''}</span>`;
  board.innerHTML=state.operations.map(o=>{const empId=displayedAssignments[o.id];const emp=state.employees.find(e=>e.id===empId);const lv=emp?skill(emp.id,o.id):'sem_habilitacao';const info=levelInfo(lv);const apto=emp&&isApto(lv);return `<div class="step-card"><div class="step-head"><div class="step-code">${escapeHtml(o.code)}</div><div class="step-meta"><span>Step</span><span class="mode-pill ${plan.mode}">${plan.mode==='automatic'?'automática':'manual'}</span></div></div><div class="step-body">${emp?`<div class="assembler ${apto?'':'assembler-ineligible'}"><div class="assembler-avatar">${emp.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div><div><div class="assembler-name">${escapeHtml(emp.name)}</div><small class="assembler-level ${lv}">${apto?info[1]:`${info[1]} · Não apto para distribuição`}</small></div><button class="operation-delete" onclick="assign('${o.id}',null)" title="Remover">×</button></div>`:'<div class="empty-step">Nenhum montador apto alocado</div>'}<button class="step-add" onclick="openAssignModal('${o.id}')">＋ Alocar montador apto</button></div></div>`}).join(''); renderSuggestionPreview(); renderRouteEditor(); }
function renderRouteEditor(){
  const el=document.querySelector('#routeEditor');if(!el)return;
  const plan=activePlan();
  el.innerHTML=state.employees.map(emp=>{
    const eligible=eligibleOperations(emp.id);
    const schedule=plan.weeklySchedules?.[emp.id]||{};
    const currentEntry=Object.entries(plan.assignments||{}).find(([,employeeId])=>employeeId===emp.id);
    const currentOp=state.operations.find(o=>o.id===currentEntry?.[0]);
    if(!eligible.length)return `<div class="route-row"><div class="route-person"><strong>${escapeHtml(emp.name)}</strong><small>Nenhum step apto</small></div><span class="route-empty">Cadastre Titular ou Nível 3 na matriz.</span></div>`;
    const options=`<option value="">Sem programação</option>${eligible.map(op=>`<option value="${op.id}">${escapeHtml(op.code)}</option>`).join('')}`;
    return `<div class="route-row"><div class="route-person"><strong>${escapeHtml(emp.name)}</strong><small>Programe um step apto para cada dia</small>${currentOp?`<span class="current-step-badge">Atual: <b>${escapeHtml(currentOp.code)}</b></span>`:'<span class="current-step-badge empty">Sem alocação atual</span>'}</div><div class="route-slots">${WEEKDAYS.map(([key,label])=>`<label class="route-slot"><span>${label}</span><select data-weekly-employee="${emp.id}" data-weekly-day="${key}" aria-label="${label} para ${escapeHtml(emp.name)}">${options.replace(`value="${schedule[key]||''}"`, `value="${schedule[key]||''}" selected`)}</select></label>`).join('')}</div><button class="btn secondary route-reset" data-weekly-reset="${emp.id}">Limpar semana</button></div>`;
  }).join('');
  bindWeeklyScheduleEvents();
}
function eligibleOperations(empId){return state.operations.filter(o=>isApto(skill(empId,o.id)));}
function routeFor(empId){const eligible=eligibleOperations(empId).map(o=>o.id);const schedule=activePlan().weeklySchedules?.[empId]||{};const weekly=WEEKDAYS.map(([key])=>schedule[key]).filter(id=>eligible.includes(id));const saved=activePlan().rotationRoutes?.[empId];const legacy=Array.isArray(saved)?saved.filter(id=>eligible.includes(id)):[];return [...new Set([...(weekly.length?weekly:legacy),...eligible])];}
function saveWeeklySchedule(empId,day,opId){const plan=activePlan();const eligible=eligibleOperations(empId).some(o=>o.id===opId);if(opId&&!eligible){flash('Ação bloqueada: o funcionário não é apto para este step');renderLineBoard();return false;}const original=plan.weeklySchedules?.[empId]?.[day]||'';const candidate=JSON.parse(JSON.stringify(plan));candidate.weeklySchedules=candidate.weeklySchedules||{};candidate.weeklySchedules[empId]=candidate.weeklySchedules[empId]||{};if(opId)candidate.weeklySchedules[empId][day]=opId;else delete candidate.weeklySchedules[empId][day];const error=weeklyValidation({...plan,weeklySchedules:candidate.weeklySchedules},empId,day,opId);if(error){flash('Ação bloqueada: '+error);renderLineBoard();return false;}plan.weeklySchedules=candidate.weeklySchedules;if(!save())return false;renderLineBoard();flash(original&&opId&&original!==opId?'Step alterado e programação salva':'Programação semanal salva');return true;}
function bindWeeklyScheduleEvents(){document.querySelectorAll('[data-weekly-employee]').forEach(select=>select.onchange=()=>saveWeeklySchedule(select.dataset.weeklyEmployee,select.dataset.weeklyDay,select.value));document.querySelectorAll('[data-weekly-reset]').forEach(button=>button.onclick=()=>{delete activePlan().weeklySchedules[button.dataset.weeklyReset];save();renderLineBoard();flash('Programação semanal limpa');});}
function openAssignModal(opId){modalMode='assign';modalId=opId;document.querySelector('#modalTitle').textContent='Alocar montador';document.querySelector('#modalLabel').textContent='Selecione o funcionário';const op=state.operations.find(o=>o.id===opId);const plan=activePlan();const currentEmployee=plan.assignments?.[opId]||'';const eligible=state.employees.filter(e=>isApto(skill(e.id,opId)));const options=eligible.map(e=>{const info=levelInfo(skill(e.id,opId));const selected=e.id===currentEmployee?' selected':'';return `<option value="${e.id}"${selected}>${escapeHtml(e.name)} (${info[1]})</option>`}).join('')||'<option value="">Nenhum montador apto disponível</option>';document.querySelector('#modalInput').outerHTML=`<select id="modalInput" class="modal-select"><option value="">Selecione...</option>${options}</select>`;document.querySelector('#modalBackdrop').classList.remove('hidden');}
function assign(opId,empId){const plan=activePlan();const day=currentWeekday();plan.assignments=plan.assignments||{};plan.weeklySchedules=plan.weeklySchedules||{};if(empId&&!isApto(skill(empId,opId))){flash('Ação bloqueada: somente Titular ou Nível 3 pode ser distribuído');return false;}if(empId){const conflict=state.employees.find(emp=>emp.id!==empId&&plan.weeklySchedules?.[emp.id]?.[day]===opId);if(conflict){flash(`Ação bloqueada: ${opId} já está programado para ${conflict.name} hoje`);return false;}const scheduled=plan.weeklySchedules[empId]?.[day];if(scheduled&&scheduled!==opId){delete plan.weeklySchedules[empId][day];flash(`Programação de ${state.employees.find(e=>e.id===empId)?.name||'funcionário'} substituída para este dia`);}}Object.keys(plan.assignments).forEach(id=>{if(id!==opId&&plan.assignments[id]===empId)delete plan.assignments[id]});if(empId)plan.assignments[opId]=empId;else {delete plan.assignments[opId];Object.keys(plan.weeklySchedules||{}).forEach(employeeId=>{if(plan.weeklySchedules[employeeId]?.[day]===opId)delete plan.weeklySchedules[employeeId][day];});}if(empId&&['segunda','terca','quarta','quinta','sexta'].includes(day)){plan.weeklySchedules[empId]=plan.weeklySchedules[empId]||{};plan.weeklySchedules[empId][day]=opId;}if(!save())return false;renderLineBoard();flash(empId?'Montador alocado manualmente':'Alocação removida');return true;}
function rotateAssignments(){
  const plan=activePlan();
  const current=plan.assignments||{};
  const operations=[...state.operations];
  const employees=[...state.employees];
  const currentOperationByEmployee=new Map();
  Object.entries(current).forEach(([opId,empId])=>{
    const emp=employees.find(e=>e.id===empId);
    if(emp&&isApto(skill(emp.id,opId))&&!currentOperationByEmployee.has(emp.id)) currentOperationByEmployee.set(emp.id,opId);
  });
  const candidateMap=new Map();
  const rotationDay=currentWeekday();
  operations.forEach(op=>candidateMap.set(op.id,employees.filter(emp=>isApto(skill(emp.id,op.id)))));
  plan.rotationState=plan.rotationState&&typeof plan.rotationState==='object'?plan.rotationState:{};
  const shuffled=(items)=>{
    const result=[...items];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  };
  const rotationOptions=new Map();
  employees.forEach(employee=>{
    const route=routeFor(employee.id);
    const currentOpId=currentOperationByEmployee.get(employee.id);
    let visited=Array.isArray(plan.rotationState[employee.id]?.visited)?plan.rotationState[employee.id].visited.filter(id=>route.includes(id)):[];
    const next=()=>route.filter(id=>id!==currentOpId&&!visited.includes(id));
    if(!next().length){
      visited=[];
      plan.rotationState[employee.id]={visited};
    }
    rotationOptions.set(employee.id,{route,visited,currentOpId});
  });
  const canUse=(employee,opId)=>isApto(skill(employee.id,opId));
  const match=(allowSameStep)=>{
    const employeeToOperation=new Map();
    const operationToEmployee=new Map();
    const orderedOperations=shuffled(operations).sort((a,b)=>candidateMap.get(a.id).length-candidateMap.get(b.id).length);
    const orderedCandidates=(op)=>shuffled(candidateMap.get(op.id)).filter(employee=>canUse(employee,op.id)).sort((a,b)=>{
      const ai=rotationOptions.get(a.id), bi=rotationOptions.get(b.id);
      const aCurrent=ai.currentOpId===op.id?1:0, bCurrent=bi.currentOpId===op.id?1:0;
      const aScheduled=scheduledOperationFor(a.id,rotationDay)===op.id?0:1, bScheduled=scheduledOperationFor(b.id,rotationDay)===op.id?0:1;
      return aScheduled-bScheduled || aCurrent-bCurrent || (ai.visited.includes(op.id)?1:0)-(bi.visited.includes(op.id)?1:0) || skillScore(skill(b.id,op.id))-skillScore(skill(a.id,op.id));
    });
    const reassign=(opId,seenEmployees,seenOperations)=>{
      if(seenOperations.has(opId))return false;
      seenOperations.add(opId);
      const op=operations.find(item=>item.id===opId);
      if(!op)return false;
      for(const employee of orderedCandidates(op)){
        if(seenEmployees.has(employee.id))continue;
        seenEmployees.add(employee.id);
        const previousOperationId=employeeToOperation.get(employee.id);
        if(!previousOperationId||reassign(previousOperationId,seenEmployees,seenOperations)){
          employeeToOperation.set(employee.id,opId);
          operationToEmployee.set(opId,employee.id);
          return true;
        }
      }
      return false;
    };
    orderedOperations.forEach(op=>reassign(op.id,new Set(),new Set()));
    const assignments={};
    operationToEmployee.forEach((employeeId,opId)=>assignments[opId]=employeeId);
    const entries=[...operationToEmployee.entries()];
    const fresh=entries.filter(([opId,employeeId])=>!rotationOptions.get(employeeId).visited.includes(opId)).length;
    const repeated=entries.filter(([opId,employeeId])=>current[opId]===employeeId).length;
    return {assignments,assigned:entries.length,fresh,repeated};
  };
  const attempts=Array.from({length:Math.max(12,operations.length*3)},()=>match(true));
  const best=attempts.reduce((winner,candidate)=>candidate.assigned>winner.assigned||(candidate.assigned===winner.assigned&&(candidate.fresh>winner.fresh||(candidate.fresh===winner.fresh&&candidate.repeated<winner.repeated)))?candidate:winner);
  plan.assignments=best.assignments;
  Object.entries(best.assignments).forEach(([opId,empId])=>{
    const info=rotationOptions.get(empId);
    if(!info)return;
    const visited=new Set(info.visited);
    visited.add(opId);
    plan.rotationState[empId]={visited:[...visited].filter(id=>info.route.includes(id))};
  });
  plan.lastRun=today();
  plan.lastRotation={date:today(),assigned:best.assigned,total:operations.length,repeated:best.repeated};
  if(plan.scheduledDate){const date=new Date(plan.scheduledDate+'T00:00:00');date.setDate(date.getDate()+(plan.frequency==='daily'?1:7));plan.scheduledDate=date.toISOString().slice(0,10);}
  return plan.lastRotation;
}
function maybeRunScheduledRotation(){const plan=activePlan();const day=today();if(plan.mode==='automatic'&&plan.scheduledDate&&day>=plan.scheduledDate&&plan.lastRun!==day){rotateAssignments();save();}}
function runRotation(){const summary=rotateAssignments();save();render();const missing=summary.total-summary.assigned;flash(missing?`Rotação concluída com ${missing} step(s) sem alocação possível`:`Rotação concluída com ${summary.assigned} de ${summary.total} steps alocados`);}
function skillScore(value){return {titular:4,nivel_1:3,nivel_2:2,nivel_3:1,formacao_planejada:0}[value]??-1;}
function buildDaySuggestion(previousAssignments,currentAssignments){
  const employees=[...state.employees];
  const candidateMap=new Map();
  state.operations.forEach(op=>candidateMap.set(op.id,employees.filter(emp=>isApto(skill(emp.id,op.id)))));
  const operations=[...state.operations].sort((a,b)=>candidateMap.get(a.id).length-candidateMap.get(b.id).length||a.code.localeCompare(b.code,'pt-BR'));
  function match(strict){
    const employeeToOperation=new Map();const operationToEmployee=new Map();
    function candidates(op){return [...candidateMap.get(op.id)].filter(emp=>!strict||previousAssignments[emp.id]!==op.id).sort((a,b)=>{
      const ac=currentAssignments[op.id]===a.id?1:0,bc=currentAssignments[op.id]===b.id?1:0;
      return bc-ac||skillScore(skill(b.id,op.id))-skillScore(skill(a.id,op.id))||a.name.localeCompare(b.name,'pt-BR');
    });}
    function reassign(opId,seenEmployees,seenOperations){
      if(seenOperations.has(opId))return false;seenOperations.add(opId);
      for(const employee of candidates(state.operations.find(item=>item.id===opId)||{})){
        if(seenEmployees.has(employee.id))continue;seenEmployees.add(employee.id);
        const previousOperationId=employeeToOperation.get(employee.id);
        if(!previousOperationId||reassign(previousOperationId,seenEmployees,seenOperations)){employeeToOperation.set(employee.id,opId);operationToEmployee.set(opId,employee.id);return true;}
      }
      return false;
    }
    operations.forEach(op=>reassign(op.id,new Set(),new Set()));
    const assignments={};operationToEmployee.forEach((employeeId,opId)=>assignments[opId]=employeeId);return assignments;
  }
  const assignments=match(true);
  const rows=state.operations.map(op=>{const employeeId=assignments[op.id]||'';return {opId:op.id,employeeId,level:employeeId?skill(employeeId,op.id):'',currentEmployeeId:currentAssignments[op.id]||'',qualifiedCount:candidateMap.get(op.id).length};});
  return {assignments,rows,assigned:rows.filter(row=>row.employeeId).length,total:state.operations.length};
}
function buildDistributionSuggestion(){
  const plan=activePlan();const weeklySchedules={};const days=[];let previousAssignments={};
  WEEKDAYS.forEach(([key,label])=>{
    const currentAssignments={};state.employees.forEach(emp=>{const opId=plan.weeklySchedules?.[emp.id]?.[key];if(opId)currentAssignments[opId]=emp.id;});
    const day=buildDaySuggestion(previousAssignments,currentAssignments);days.push({key,label,...day});
    Object.entries(day.assignments).forEach(([opId,empId])=>{weeklySchedules[empId]=weeklySchedules[empId]||{};weeklySchedules[empId][key]=opId;});
    previousAssignments={};Object.entries(day.assignments).forEach(([opId,empId])=>{previousAssignments[empId]=opId;});
  });
  const first=days[0]||{assignments:{},rows:[],assigned:0,total:state.operations.length};const assignments={...first.assignments};
  return {assignments,rows:first.rows,days,weeklySchedules};
}
function renderSuggestionPreview(){
  const box=document.querySelector('#suggestionPreview');if(!box)return;
  if(!pendingSuggestion){box.classList.add('hidden');box.innerHTML='';return;}
  const suggestion=pendingSuggestion;const assigned=suggestion.days.reduce((sum,day)=>sum+day.assigned,0);const total=suggestion.days.length*state.operations.length;const missing=total-assigned;
  const weekHtml=suggestion.days.map(day=>`<div class="suggestion-day"><strong>${day.label}</strong><span>${day.assigned} de ${day.total} steps preenchidos</span><div>${day.rows.map(row=>{const op=state.operations.find(o=>o.id===row.opId);const emp=state.employees.find(e=>e.id===row.employeeId);return `<span class="suggestion-week-item"><b>${escapeHtml(op?.code||'Step')}</b>: ${emp?escapeHtml(emp.name):'Sem montador apto'}</span>`}).join('')}</div></div>`).join('');
  const alert=missing?`<div class="suggestion-alert"><strong>⚠ Cobertura máxima semanal encontrada</strong><span>${missing} alocação(ões) não puderam ser preenchidas com a equipe apta atual. Os demais dias continuam programados.</span></div>`:`<div class="suggestion-success">✓ Todos os steps foram programados de segunda a sexta-feira.</div>`;
  box.classList.remove('hidden');box.innerHTML=`<div class="suggestion-head"><div><strong>Sugestão automática para a semana</strong><span>${assigned} de ${total} alocações previstas</span></div><div class="suggestion-actions"><button class="btn secondary" id="cancelSuggestionBtn">Cancelar</button><button class="btn primary" id="applySuggestionBtn">Aplicar semana</button></div></div>${alert}<div class="suggestion-week">${weekHtml}</div>`;
  document.querySelector('#cancelSuggestionBtn').onclick=()=>{pendingSuggestion=null;renderSuggestionPreview();};
  document.querySelector('#applySuggestionBtn').onclick=()=>{const plan=activePlan();const suggestionToApply=pendingSuggestion;plan.assignments={...suggestionToApply.assignments};plan.weeklySchedules={...suggestionToApply.weeklySchedules};pendingSuggestion=null;if(save()){renderLineBoard();flash('Sugestão semanal aplicada de segunda a sexta');}};
}
function suggestDistribution(){pendingSuggestion=buildDistributionSuggestion();renderSuggestionPreview();flash('Sugestão pronta para revisão');}
function barDummy(){}
function bindMatrixEvents(){document.querySelectorAll('.cell-select').forEach(s=>s.onchange=()=>{state.skills[s.dataset.employee+'|'+s.dataset.operation]=s.value;save();render();flash('Habilitação salva');});document.querySelectorAll('[data-edit-employee]').forEach(b=>b.onclick=()=>openModal('employee',b.dataset.editEmployee));document.querySelectorAll('[data-delete-employee]').forEach(b=>b.onclick=()=>{if(confirm('Remover este funcionário da matriz?')){state.employees=state.employees.filter(e=>e.id!==b.dataset.deleteEmployee);state.linePlans.forEach(p=>{delete p.rotationRoutes[b.dataset.deleteEmployee];Object.keys(p.assignments).forEach(o=>{if(p.assignments[o]===b.dataset.deleteEmployee)delete p.assignments[o];});});save();render();flash('Funcionário removido');}});document.querySelectorAll('[data-edit-operation]').forEach(b=>b.onclick=()=>openModal('operation',b.dataset.editOperation));document.querySelectorAll('[data-delete-operation]').forEach(b=>b.onclick=()=>{if(confirm('Remover esta operação da matriz?')){state.operations=state.operations.filter(o=>o.id!==b.dataset.deleteOperation);state.linePlans.forEach(p=>{delete p.assignments[b.dataset.deleteOperation];Object.keys(p.rotationRoutes).forEach(e=>p.rotationRoutes[e]=p.rotationRoutes[e].filter(id=>id!==b.dataset.deleteOperation));});save();render();flash('Operação removida');}});}
function openLineModal(id=null){modalMode='line';modalId=id;document.querySelector('#modalTitle').textContent=id?'Editar linha':'Adicionar linha';document.querySelector('#modalLabel').textContent='Nome da linha';document.querySelector('#modalInput').value=id?(state.linePlans.find(l=>l.id===id)?.name||''):'';document.querySelector('#modalBackdrop').classList.remove('hidden');document.querySelector('#modalInput').focus();}
function openMatrixModal(id=null){modalMode='matrix';modalId=id;document.querySelector('#modalTitle').textContent=id?'Renomear tabela':'Nova tabela';document.querySelector('#modalLabel').textContent='Nome da tabela';document.querySelector('#modalInput').value=id?(state.matrices.find(m=>m.id===id)?.name||''):'';document.querySelector('#modalBackdrop').classList.remove('hidden');document.querySelector('#modalInput').focus();}
function openModal(mode,id=null){modalMode=mode;modalId=id;document.querySelector('#modalTitle').textContent=id?(mode==='employee'?'Editar funcionário':'Editar operação'):(mode==='employee'?'Adicionar funcionário':'Adicionar operação');document.querySelector('#modalLabel').textContent=mode==='employee'?'Nome completo':'Código da operação';document.querySelector('#modalInput').value=id?(mode==='employee'?state.employees.find(e=>e.id===id).name:state.operations.find(o=>o.id===id).code):'';document.querySelector('#modalBackdrop').classList.remove('hidden');document.querySelector('#modalInput').focus();}
function closeModal(){document.querySelector('#modalBackdrop').classList.add('hidden');const select=document.querySelector('.modal-select');if(select)select.outerHTML='<input id="modalInput" autocomplete="off">';modalMode=null;modalId=null;}
function saveModal(){const input=document.querySelector('#modalInput');const value=input.value.trim();if(modalMode==='assign'){if(value)assign(modalId,value);closeModal();return;}if(value.length<2)return;if(modalMode==='matrix'){if(modalId)state.matrices.find(m=>m.id===modalId).name=value;else{const id='table-'+Date.now();const copy=matrixFromState({employees:state.employees,operations:state.operations,skills:state.skills,linePlans:state.linePlans,activeLineId:state.activeLineId},id,value);state.matrices.push(copy);syncCurrentMatrix();activateMatrix(id);}save();closeModal();render();flash('Tabela salva');return;}if(modalMode==='line'){if(modalId)state.linePlans.find(l=>l.id===modalId).name=value;else{const id='line-'+Date.now();state.linePlans.push(blankPlan(id,value));state.activeLineId=id;}save();closeModal();renderLineBoard();flash('Linha salva');return;}if(modalMode==='employee'){if(modalId)state.employees.find(e=>e.id===modalId).name=value;else state.employees.push({id:'e'+Date.now(),name:value});}else{if(modalId)state.operations.find(o=>o.id===modalId).code=value;else state.operations.push({id:'o'+Date.now(),code:value});}save();closeModal();render();flash('Alteração salva');}
function deleteActiveLine(){if(state.linePlans.length<=1){flash('Mantenha pelo menos uma linha');return;}if(confirm('Remover esta linha?')){state.linePlans=state.linePlans.filter(l=>l.id!==activePlan().id);state.activeLineId=state.linePlans[0].id;save();renderLineBoard();flash('Linha removida');}}
function deleteActiveMatrix(){if(state.matrices.length<=1){flash('Mantenha pelo menos uma tabela');return;}const matrix=state.matrices.find(m=>m.id===state.activeMatrixId);if(confirm(`Remover a tabela "${matrix?.name||''}"?`)){state.matrices=state.matrices.filter(m=>m.id!==state.activeMatrixId);activateMatrix(state.matrices[0].id);save();render();flash('Tabela removida');}}
function exportJson(){syncCurrentMatrix();const payload={format:'Matriz Multi Skill Local',version:4,exportedAt:new Date().toISOString(),matrices:state.matrices,activeMatrixId:state.activeMatrixId,employees:state.employees,operations:state.operations,skills:state.skills,linePlans:state.linePlans,activeLineId:state.activeLineId};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='matriz-multi-skill-'+today()+'.json';a.click();URL.revokeObjectURL(url);flash('JSON exportado com sucesso');}
function validMatrix(data){
  if(!data||!Array.isArray(data.employees)||!Array.isArray(data.operations)||!data.skills||typeof data.skills!=='object'||!data.employees.length||!data.operations.length)return false;
  const eids=new Set(),oids=new Set(),allowed=new Set(levels.map(l=>l[0]));
  if(data.employees.some(e=>!e||typeof e.id!=='string'||!e.id.trim()||typeof e.name!=='string'||!e.name.trim()||eids.has(e.id)))return false;
  data.employees.forEach(e=>eids.add(e.id));
  if(data.operations.some(o=>!o||typeof o.id!=='string'||!o.id.trim()||typeof o.code!=='string'||!o.code.trim()||oids.has(o.id)))return false;
  data.operations.forEach(o=>oids.add(o.id));
  if(!Object.entries(data.skills).every(([k,v])=>{const p=k.split('|');return p.length===2&&eids.has(p[0])&&oids.has(p[1])&&typeof v==='string'&&allowed.has(v)}))return false;
  const plans=Array.isArray(data.linePlans)?data.linePlans:(data.linePlan?[data.linePlan]:[]);
  return plans.length>0&&plans.every(p=>p&&typeof p==='object'&&typeof (p.name||'Linha')==='string'&&(!p.assignments||Object.entries(p.assignments).every(([o,e])=>oids.has(o)&&eids.has(e)))&&(!p.rotationRoutes||typeof p.rotationRoutes==='object'));
}
function validImport(data){const matrices=Array.isArray(data?.matrices)&&data.matrices.length?data.matrices:[data];return matrices.length>0&&matrices.every(m=>m&&Array.isArray(m.employees)&&Array.isArray(m.operations)&&m.skills&&typeof m.skills==='object');}
function importJson(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const text=String(reader.result||'').replace(/^\uFEFF/,'').trim();
      const data=JSON.parse(text);
      if(!validImport(data))throw new Error('Formato inválido');
      const rawMatrices=Array.isArray(data.matrices)&&data.matrices.length?data.matrices:[data];
      const matrices=rawMatrices.map((m,i)=>matrixFromState(m,m.id||'table-'+(i+1),m.name||'Tabela '+(i+1)));
      state={matrices,activeMatrixId:data.activeMatrixId&&matrices.some(m=>m.id===data.activeMatrixId)?data.activeMatrixId:matrices[0].id};
      activateMatrix(state.activeMatrixId);save();render();flash('JSON importado com sucesso');
    }catch(e){console.error('Falha ao importar JSON:',e);flash('Não foi possível importar este JSON: formato inválido');}
  };
  reader.onerror=()=>flash('Não foi possível ler o arquivo JSON');
  reader.readAsText(file,'UTF-8');
}
function flash(message){const n=document.createElement('div');n.textContent=message;n.style='position:fixed;right:20px;bottom:20px;background:#0f172a;color:white;padding:12px 16px;border-radius:10px;z-index:9;font-weight:600;font-size:13px;box-shadow:0 10px 30px #0003';document.body.appendChild(n);setTimeout(()=>n.remove(),1800);}
function setMenu(open){const shell=document.querySelector('.app-shell');const toggle=document.querySelector('#menuToggle');if(!shell)return;shell.classList.toggle('menu-open',open);if(toggle){toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'× Fechar menu':'☰ Abrir menu';}}
function showMatrix(){document.querySelector('#matriz').classList.remove('hidden');document.querySelector('.summary-grid').classList.remove('hidden');document.querySelector('#lineScreen').classList.add('hidden');document.querySelector('#matrixNav').classList.add('active');document.querySelector('#lineNav').classList.remove('active');setMenu(false);}
function showLine(){document.querySelector('#matriz').classList.add('hidden');document.querySelector('.summary-grid').classList.add('hidden');document.querySelector('#lineScreen').classList.remove('hidden');document.querySelector('#matrixNav').classList.remove('active');document.querySelector('#lineNav').classList.add('active');setMenu(false);renderLineBoard();}
document.querySelector('#menuToggle').onclick=()=>setMenu(!document.querySelector('.app-shell').classList.contains('menu-open'));document.querySelector('#sidebarClose').onclick=()=>setMenu(false);document.querySelector('#menuBackdrop').onclick=()=>setMenu(false);document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false);});document.querySelector('#searchInput').addEventListener('input',render);document.querySelector('#matrixSelect').onchange=e=>{syncCurrentMatrix();activateMatrix(e.target.value);save();render();};document.querySelector('#addMatrixBtn').onclick=()=>openMatrixModal();document.querySelector('#editMatrixBtn').onclick=()=>openMatrixModal(state.activeMatrixId);document.querySelector('#deleteMatrixBtn').onclick=deleteActiveMatrix;document.querySelector('#exportBtn').onclick=exportJson;document.querySelector('#importBtn').onclick=()=>document.querySelector('#importFile').click();document.querySelector('#importFile').onchange=e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value=''};document.querySelector('#addEmployeeBtn').onclick=()=>openModal('employee');document.querySelector('#addOperationBtn').onclick=()=>openModal('operation');document.querySelector('#closeModal').onclick=closeModal;document.querySelector('#cancelModal').onclick=closeModal;document.querySelector('#saveModal').onclick=saveModal;document.querySelector('#modalInput').onkeydown=e=>{if(e.key==='Enter')saveModal();if(e.key==='Escape')closeModal()};document.querySelector('#matrixNav').onclick=e=>{e.preventDefault();showMatrix();};document.querySelector('#lineNav').onclick=showLine;document.querySelector('#rotationDate').onchange=e=>{activePlan().scheduledDate=e.target.value;save();renderLineBoard();};document.querySelector('#rotationFrequency').onchange=e=>{activePlan().frequency=e.target.value;save();renderLineBoard();};document.querySelector('#rotationMode').onchange=e=>{activePlan().mode=e.target.value;save();renderLineBoard();};document.querySelector('#runRotationBtn').onclick=runRotation;document.querySelector('#suggestDistributionBtn').onclick=suggestDistribution;document.querySelector('#lineSelect').onchange=e=>{state.activeLineId=e.target.value;save();renderLineBoard();};document.querySelector('#addLineBtn').onclick=()=>openLineModal();document.querySelector('#editLineBtn').onclick=()=>openLineModal(activePlan().id);document.querySelector('#deleteLineBtn').onclick=deleteActiveLine;window.assign=assign;window.openAssignModal=openAssignModal;window.saveRouteOrder=saveRouteOrder;window.openLineModal=openLineModal;window.addEventListener('pagehide',save);window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});window.addEventListener('storage',event=>{if(event.key===KEY){state=load();render();}});function boot(){try{render();}catch(error){console.error('Falha ao renderizar a aplicação:',error);setTimeout(()=>{try{render();}catch(retryError){console.error('Falha na segunda tentativa de renderização:',retryError);}},0);}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('load',boot,{once:true});setTimeout(boot,0);setTimeout(boot,100);setInterval(()=>{const plan=activePlan();const day=today();if(plan.mode==='automatic'&&plan.scheduledDate&&day>=plan.scheduledDate&&plan.lastRun!==day){rotateAssignments();save();render();flash('Rotação automática executada');}},60000);
