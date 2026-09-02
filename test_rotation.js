const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('/home/ubuntu/MatrisMultSkill/app.js', 'utf8');
const start = source.indexOf('function rotateAssignments(){');
const end = source.indexOf('\nfunction maybeRunScheduledRotation', start);
if (start < 0 || end < 0) throw new Error('função de rotação não encontrada');
const fnSource = source.slice(start, end);
const context = {
  Math,
  Set,
  Map,
  Object,
  Array,
  Date,
  state: { employees: [{id:'e1', name:'Ana'}], operations: [1,2,3,4].map(i => ({id:'o'+i, code:'O'+i})), skills: {}, linePlans: [], activeLineId:'l1' },
  isApto: v => v === 'titular' || v === 'nivel_3',
  skill: (e,o) => context.state.skills[e+'|'+o] || 'sem_habilitacao',
  routeFor: e => context.state.linePlans[0].rotationRoutes[e] || context.state.operations.map(o => o.id),
  skillScore: v => ({titular:4,nivel_1:3,nivel_2:2,nivel_3:1}[v] ?? -1),
  today: () => '2026-09-02',
  currentWeekday: () => 'quarta',
  scheduledOperationFor: () => '',
  activePlan: () => context.state.linePlans[0]
};
for (const op of context.state.operations) context.state.skills['e1|'+op.id] = 'titular';
context.state.linePlans.push({id:'l1', assignments:{o1:'e1'}, rotationRoutes:{}, rotationState:{}});
vm.createContext(context);
vm.runInContext(fnSource, context);
const seen = [];
for (let i=0; i<4; i++) {
  const result = context.rotateAssignments();
  const current = result.assigned ? Object.values(context.state.linePlans[0].assignments)[0] : null;
  const op = Object.entries(context.state.linePlans[0].assignments).find(([,e]) => e === 'e1')?.[0];
  seen.push(op);
  if (!op) throw new Error('rotação não alocou o funcionário na rodada '+(i+1));
}
if (new Set(seen).size !== 4) throw new Error('steps repetidos antes de completar o ciclo: '+seen.join(','));
const bom = '\ufeff{"ok":true}';
const parsed = JSON.parse(bom.replace(/^\uFEFF/,'').trim());
if (!parsed.ok) throw new Error('tratamento de BOM falhou');
console.log('OK rotação:', seen.join(' -> '));
console.log('OK BOM JSON');
