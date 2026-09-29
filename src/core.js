(function (root) {
  'use strict';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  function parseRoute(hash) {
    const parts = String(hash || '#/home').replace(/^#\/?/, '').split('/');
    const pages = ['home', 'path', 'lesson', 'labs', 'lab', 'glossary', 'resources', 'study', 'progress', 'about'];
    const page = parts[0] || 'home';
    if (!pages.includes(page) || parts.length > 2 || (parts[1] && !/^[a-z0-9-]+$/.test(parts[1]))) return { page: 'missing', id: '' };
    return { page, id: parts[1] || '' };
  }
  function searchLessons(lessons, query) {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return lessons.filter(lesson => words.every(word => `${lesson.title} ${lesson.objective} ${lesson.explanation.join(' ')} ${lesson.id}`.toLowerCase().includes(word)));
  }
  function blankState() {
    return { format: 'hubspot-learning-lab', version: 1, completed: [], quizzes: {}, notes: {}, bookmarks: [], lastLesson: '', labs: {}, project: [], preferences: { theme: 'system', motion: 'system' } };
  }
  function percent(count, total) { return total > 0 ? Math.round(count / total * 100) : 0; }
  const contacts = [
    { id:'maya', firstName:'Maya', lastName:'Patel', email:'maya@cedar.example', city:'London', interest:'Design', subscribed:true, registered:true, team:true },
    { id:'sam', firstName:'Sam', lastName:'Rao', email:'sam@studio.example', city:'Delhi', interest:'Design', subscribed:true, registered:true, team:false },
    { id:'leo', firstName:'Leo', lastName:'Chen', email:'leo@north.example', city:'London', interest:'Analytics', subscribed:true, registered:false, team:false },
    { id:'noah', firstName:'Noah', lastName:'Ali', email:'noah@cedar.example', city:'London', interest:'Design', subscribed:false, registered:true, team:true },
    { id:'nia', firstName:'Nia', lastName:'Reed', email:'nia@west.example', city:'Berlin', interest:'Writing', subscribed:true, registered:false, team:false },
    { id:'imani', firstName:'Imani', lastName:'Cole', email:'imani@east.example', city:'Delhi', interest:'Analytics', subscribed:true, registered:true, team:false },
  ];
  const importColumns = [
    { key:'given', title:'Given name', example:'Maya', expected:'firstname', label:'First name' },
    { key:'family', title:'Family name', example:'Patel', expected:'lastname', label:'Last name' },
    { key:'email', title:'Email address', example:'maya@cedar.example', expected:'email', label:'Email' },
    { key:'city', title:'City', example:'London', expected:'city', label:'City' },
  ];
  const dealStages = ['Qualified','Proposal','Closed won','Closed lost'];
  const deals = [
    { id:'cedar', name:'Cedar Studio', description:'Team Design workshop', amount:2400, stage:'Proposal' },
    { id:'north', name:'North Studio', description:'Analytics team session', amount:1200, stage:'Qualified' },
    { id:'west', name:'West Studio', description:'Writing team session', amount:900, stage:'Qualified' },
  ];
  function initialLab(id) {
    const defaults = {
      contact:{ passed:false, firstName:'Maya', lastName:'Patel', email:'maya@cedar.example', city:'London', interest:'Design' },
      import:{ passed:false, mappings:{ given:'',family:'',email:'',city:'' } },
      segments:{ passed:false, interest:'Design', city:'London', operator:'OR', subscribedOnly:false, mode:'active', snapshot:null },
      email:{ passed:false, firstName:'Maya', fallback:'there', subject:'A practical Design workshop for your team', message:'Build clearer slides with three practical design techniques. Explore a beginner-friendly workshop and see whether it fits your team.', checklist:[], missingPreviewed:false },
      workflow:{ passed:false, sampleId:'maya', delayDays:1, salesTask:true, runs:[] },
      pipeline:{ passed:false, stages:Object.fromEntries(deals.map(deal=>[deal.id,deal.stage])), answer:'' },
    };
    if (!Object.hasOwn(defaults,id)) throw new Error('Unknown lab');
    return defaults[id];
  }
  function validateContact(contact) {
    const errors=[];
    if(!String(contact.firstName||'').trim())errors.push('Add a fictional first name.');
    if(!String(contact.lastName||'').trim())errors.push('Add a fictional last name.');
    if(!/^[^\s@]+@(?:[a-z0-9-]+\.)+example$/i.test(contact.email||''))errors.push('Use a fictional address ending in .example, such as maya@cedar.example.');
    if(!['Design','Analytics','Writing'].includes(contact.interest))errors.push('Choose a workshop interest.');
    if(!['London','Delhi','Berlin'].includes(contact.city))errors.push('Choose one of the example cities.');
    return errors;
  }
  function filterContacts(options) {
    return contacts.filter(contact=>{
      const checks=[];
      if(options.interest)checks.push(contact.interest===options.interest);
      if(options.city)checks.push(contact.city===options.city);
      const matches=checks.length===0|| (options.operator==='OR'?checks.some(Boolean):checks.every(Boolean));
      return matches && (!options.subscribedOnly||contact.subscribed);
    });
  }
  function segmentMembers(options) {
    if(options.mode==='static')return (options.snapshot||[]).map(id=>contacts.find(contact=>contact.id===id)).filter(Boolean);
    return filterContacts(options);
  }
  function checkMapping(mappings) {
    return importColumns.map(column=>({key:column.key, correct:mappings[column.key]===column.expected, message:`${column.title} (${column.example}) belongs in ${column.label}.`}));
  }
  function emailGreeting(firstName,fallback) { return `Hello ${String(firstName).trim()||String(fallback).trim()||'there'},`; }
  function simulateWorkflow(sample,options) {
    const steps=[{text:`Inspect ${sample.firstName}'s fictional registration.`,kind:'check'}];
    if(!sample.registered)return {outcome:'not-enrolled',steps:[...steps,{text:'Not registered: enrollment condition is false. No actions run.',kind:'stop'}]};
    steps.push({text:'Registered: enters the sample contact workflow.',kind:'entry'});
    if(!sample.subscribed)return {outcome:'blocked',steps:[...steps,{text:'Not subscribed: stop this marketing follow-up path. No message or sales task is produced.',kind:'stop'}]};
    steps.push({text:'Subscribed in this fictional example: the simplified eligibility check passes.',kind:'check'});
    steps.push({text:`Simulate a ${options.delayDays}-day wait. No real time passes and no job is scheduled.`,kind:'delay'});
    steps.push({text:'Assume eligibility is unchanged for this run. A real implementation must review current preferences and all other sending requirements.',kind:'check'});
    steps.push({text:'Preview a helpful workshop follow-up. Nothing is sent.',kind:'action'});
    steps.push({text:sample.team&&options.salesTask?'Explicit team-training request: simulate a task for the sales owner. No real task is created.':'No eligible sales-task action selected: do not invent a buying request.',kind:'action'});
    steps.push({text:'Finish the simulation. Review the trail against your expected result.',kind:'exit'});
    return {outcome:'eligible',steps};
  }
  function pipelineTotals(stages) {
    return deals.reduce((totals,deal)=>{
      const stage=stages[deal.id]||deal.stage;
      if(stage==='Closed won'){totals.won+=deal.amount;totals.wonCount++;}
      else if(stage==='Closed lost')totals.lost+=deal.amount;
      else if(dealStages.includes(stage)){totals.open+=deal.amount;totals.openCount++;}
      return totals;
    },{open:0,won:0,lost:0,openCount:0,wonCount:0});
  }
  function csvCell(value) {
    let text=String(value??'');
    if(/^[=+\-@\t\r]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function sampleCSV() {
    return [['First name','Last name','Email','City','Workshop interest'],...contacts.map(contact=>[contact.firstName,contact.lastName,contact.email,contact.city,contact.interest])].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
  }
  const maxImportBytes = 1024 * 1024;
  const labIds = ['contact','import','segments','email','workflow','pipeline'];
  function validateState(input,lessons,projectLength=12) {
    const fail = message => { throw new Error(`Invalid learning record: ${message}`); };
    const record = (value,keys,label) => {
      if(!value||typeof value!=='object'||Array.isArray(value))fail(`${label} must be an object.`);
      if(Object.keys(value).some(key=>!keys.includes(key)))fail(`${label} contains an unknown field.`);
      return value;
    };
    const text = (value,limit,label) => { if(typeof value!=='string'||value.length>limit)fail(`${label} is not valid text.`);return value; };
    const choice = (value,choices,label) => {if(!choices.includes(value))fail(`${label} has an unsupported value.`);return value;};
    const flag = (value,label) => {if(typeof value!=='boolean')fail(`${label} must be true or false.`);return value;};
    const selected = (value,choices,label) => {
      if(!Array.isArray(value)||value.length>choices.length||new Set(value).size!==value.length||value.some(item=>!choices.includes(item)))fail(`${label} contains invalid or duplicate entries.`);
      return [...value];
    };
    const ids=lessons.map(lesson=>lesson.id);
    record(input,['format','version','completed','quizzes','notes','bookmarks','lastLesson','labs','project','preferences','exportedAt'],'file');
    if(input.format!=='hubspot-learning-lab'||input.version!==1)fail('This file is not a supported HubSpot Learning Lab backup.');
    if(input.exportedAt!==undefined)text(input.exportedAt,64,'export time');
    const clean=blankState();
    clean.completed=selected(input.completed,ids,'completed lessons');
    clean.bookmarks=selected(input.bookmarks,ids,'bookmarks');
    clean.lastLesson=choice(input.lastLesson,['',...ids],'last lesson');
    clean.project=selected(input.project,Array.from({length:projectLength},(_,index)=>index),'project checklist');
    record(input.preferences,['theme','motion'],'preferences');
    clean.preferences={theme:choice(input.preferences.theme,['system','light','dark'],'theme'),motion:choice(input.preferences.motion,['system','off'],'motion')};
    record(input.notes,ids,'notes');
    for(const [id,note] of Object.entries(input.notes))clean.notes[id]=text(note,4000,'note');
    record(input.quizzes,ids,'quizzes');
    for(const [id,quiz] of Object.entries(input.quizzes)){
      record(quiz,['score','answers','attempts'],'quiz');
      const questions=lessons.find(lesson=>lesson.id===id).quiz;
      if(!Array.isArray(quiz.answers)||quiz.answers.length!==questions.length||quiz.answers.some((answer,index)=>!Number.isInteger(answer)||answer<0||answer>=questions[index].options.length))fail('quiz answers do not match the lesson.');
      if(!Number.isSafeInteger(quiz.attempts)||quiz.attempts<1||quiz.attempts>100000)fail('quiz attempt count is invalid.');
      const score=questions.reduce((total,question,index)=>total+(quiz.answers[index]===question.answer?1:0),0);
      if(quiz.score!==score)fail('quiz score does not match the answers.');
      clean.quizzes[id]={score,answers:[...quiz.answers],attempts:quiz.attempts};
    }
    record(input.labs,labIds,'labs');
    for(const [id,value] of Object.entries(input.labs)){
      const lab=initialLab(id);record(value,Object.keys(lab),`${id} lab`);lab.passed=flag(value.passed,'lab completion');
      if(id==='contact'){
        for(const field of ['firstName','lastName','email'])lab[field]=text(value[field],120,`contact ${field}`);
        lab.city=choice(value.city,['London','Delhi','Berlin'],'city');lab.interest=choice(value.interest,['Design','Analytics','Writing'],'interest');
      }
      if(id==='import'){
        record(value.mappings,importColumns.map(column=>column.key),'mappings');
        for(const column of importColumns)lab.mappings[column.key]=choice(value.mappings[column.key],['','firstname','lastname','email','city','company','skip'],'mapped property');
      }
      if(id==='segments'){
        lab.interest=choice(value.interest,['','Design','Analytics','Writing'],'segment interest');lab.city=choice(value.city,['','London','Delhi','Berlin'],'segment city');
        lab.operator=choice(value.operator,['AND','OR'],'operator');lab.mode=choice(value.mode,['active','static'],'segment type');lab.subscribedOnly=flag(value.subscribedOnly,'subscription check');
        lab.snapshot=value.snapshot===null?null:selected(value.snapshot,contacts.map(contact=>contact.id),'static members');
      }
      if(id==='email'){
        for(const [field,limit] of [['firstName',120],['fallback',60],['subject',180],['message',1200]])lab[field]=text(value[field],limit,`email ${field}`);
        lab.checklist=selected(value.checklist,[0,1,2,3,4],'email checklist');lab.missingPreviewed=flag(value.missingPreviewed,'missing-name preview');
      }
      if(id==='workflow'){
        lab.sampleId=choice(value.sampleId,contacts.map(contact=>contact.id),'workflow contact');lab.delayDays=choice(value.delayDays,[1,2,3],'delay');lab.salesTask=flag(value.salesTask,'sales task');
        lab.runs=selected(value.runs,['eligible','blocked','not-enrolled'],'workflow test cases');
      }
      if(id==='pipeline'){
        record(value.stages,deals.map(deal=>deal.id),'deal stages');
        for(const deal of deals)lab.stages[deal.id]=choice(value.stages[deal.id],dealStages,'deal stage');
        lab.answer=choice(value.answer,['','cash','won-not-cash','contacts'],'pipeline answer');
      }
      clean.labs[id]=lab;
    }
    return clean;
  }
  function parseBackup(value,lessons,projectLength) {
    if(typeof value!=='string'||new TextEncoder().encode(value).byteLength>maxImportBytes)throw new Error('Choose a JSON backup smaller than 1 MB.');
    let parsed;
    try{parsed=JSON.parse(value);}catch{throw new Error('This is not valid JSON. Choose a backup exported by HubSpot Learning Lab.');}
    return validateState(parsed,lessons,projectLength);
  }
  root.LabCore = { escapeHTML, parseRoute, searchLessons, blankState, percent, contacts, importColumns, dealStages, deals, initialLab, validateContact, filterContacts, segmentMembers, checkMapping, emailGreeting, simulateWorkflow, pipelineTotals, csvCell, sampleCSV, validateState, parseBackup, maxImportBytes };
})(globalThis);