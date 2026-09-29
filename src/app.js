(function () {
  'use strict';
  const course = JSON.parse(document.getElementById('course-data').textContent);
  const { modules, lessons, sources, glossary, studyPlan, projectChecklist } = course;
  const core = globalThis.LabCore;
  const html = core.escapeHTML;
  const byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const moduleFor = id => modules.find(module => module.lessons.includes(id));
  const main = document.getElementById('main');
  const dialog = document.getElementById('dialog');
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileNavigation = matchMedia('(max-width: 760px)');
  let state = core.blankState();
  let pathFilter = 'All';
  let toastTimer;
  let opener;
  let route = core.parseRoute(location.hash);
  let database = null;
  let storageReady = false;
  let saveTimer;
  let pendingImport = null;
  let activeImportRead = 0;
  let writeQueue = Promise.resolve();
  const storageKey = `progress-v1:${location.pathname.replace(/index\.html$/, '').replace(/\/$/,'')}`;

  const icons = {
    home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15"/>',
    flask: '<path d="M9 3h6m-5 0v6l-6 10q-1 2 2 2h12q3 0 2-2L14 9V3M7 15h10"/>',
    chart: '<path d="M4 3v18h17M8 16v-5m5 5V6m5 10v-7"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8 14-2 8 6-3 6 3-2-8"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-3c0-6 14-6 14 0v3M17 4c5 1 5 7 0 8m2 3c3 1 3 3 3 6"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
    filter: '<path d="M3 4h18l-7 8v7l-4 2v-9z"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M9 8v13"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    workflow: '<rect x="8" y="2" width="8" height="5" rx="1"/><rect x="2" y="16" width="7" height="5" rx="1"/><rect x="15" y="16" width="7" height="5" rx="1"/><path d="M12 7v4H5v5m7-5h7v5"/>',
    route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/>',
    flag: '<path d="M5 22V3c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
    megaphone: '<path d="m3 9 17-6v17L3 14zM6 15l3 7h4l-3-6"/>',
    columns: '<rect x="3" y="3" width="5" height="17" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/>',
    heart: '<path d="M12 21S1 14 2 8c1-6 8-6 10-1 2-5 9-5 10 1 1 6-10 13-10 13Z"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m8 12 3 3 5-6"/>',
    layers: '<path d="m2 7 10-5 10 5-10 5zM2 12l10 5 10-5M2 17l10 5 10-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v6m8-6v6M7 14h3m4 0h3m-10 4h3"/>',
    bookmark: '<path d="M6 3h12v19l-6-4-6 4z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m5 5 14 14M5 19 19 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    link: '<path d="m10 7 3-3a5 5 0 0 1 7 7l-3 3M14 17l-3 3a5 5 0 0 1-7-7l3-3M8 16l8-8"/>',
  };
  function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`; }
  function button(text, action, classes = '', extra = '') { return `<button type="button" class="button ${classes}" data-action="${action}" ${extra}>${text}</button>`; }
  function link(text, href, classes = '') { return `<a class="button ${classes}" href="${html(href)}">${text}</a>`; }
  function tag(level) { return `<span class="tag ${level.toLowerCase()}">${html(level)}</span>`; }
  function heading(eyebrow, title, description = '') { return `<div class="page-heading"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>`; }
  function toast(message) {
    clearTimeout(toastTimer);
    const element = document.getElementById('toast');
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
  }
  function storageWarning(message) {
    const warning=document.getElementById('storage-warning');warning.textContent=message;warning.hidden=false;
  }
  function persist() {
    if(!storageReady||!database)return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{saveNow();},150);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    if(!storageReady||!database)return Promise.resolve(false);
    const snapshot=JSON.parse(JSON.stringify(state));
    writeQueue=writeQueue.then(()=>new Promise(resolve=>{
      try{
        const transaction=database.transaction('learning','readwrite');
        transaction.objectStore('learning').put(snapshot,storageKey);
        transaction.oncomplete=()=>resolve(true);
        transaction.onerror=transaction.onabort=()=>{storageWarning('Your latest changes could not be saved on this device. The session still works. Export a backup from My progress before leaving.');resolve(false);};
      }catch{storageWarning('Device storage is unavailable. Continue this session and export your progress before leaving.');resolve(false);}
    }));
    return writeQueue;
  }
  async function loadProgress() {
    try{
      const saved=await new Promise((resolve,reject)=>{
        let settled=false,opened=null;
        const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timeout);if(error){opened?.close();reject(error);}else resolve(value);};
        const timeout=setTimeout(()=>finish(new Error('Device storage did not respond.')),2500);
        let request;
        try{request=indexedDB.open('hubspot-learning-lab',1);}catch(error){finish(error);return;}
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('learning'))request.result.createObjectStore('learning');};
        request.onerror=()=>finish(new Error('Device storage is blocked.'));
        request.onblocked=()=>finish(new Error('Another tab is blocking device storage.'));
        request.onsuccess=()=>{
          if(settled){request.result.close();return;}
          opened=request.result;
          try{
            const transaction=opened.transaction('learning','readonly'),get=transaction.objectStore('learning').get(storageKey);
            get.onerror=()=>finish(new Error('Saved progress could not be read.'));
            get.onsuccess=()=>{database=opened;finish(null,get.result);};
          }catch(error){finish(error);}
        };
      });
      if(saved!==undefined)state=core.validateState(saved,lessons,projectChecklist.length);
      storageReady=true;
      database.onversionchange=()=>{database.close();database=null;storageWarning('Device storage changed in another tab. Export this session’s progress and reload before continuing.');};
      database.onclose=()=>{database=null;};
    }catch{
      database?.close();database=null;storageReady=true;
      storageWarning('Saved progress is unavailable or could not be read safely. This session still works. Export a backup from My progress before leaving. Existing stored data has not been overwritten.');
    }
    applyPreferences();render();main.setAttribute('aria-busy','false');
  }
  function nextLesson() { return lessons.find(lesson => !state.completed.includes(lesson.id)) || lessons[0]; }
  function resumeLesson() { return byId.get(state.lastLesson) && !state.completed.includes(state.lastLesson) ? byId.get(state.lastLesson) : nextLesson(); }
  function sourceLinks(ids) {
    return ids.map(id => sources[id]).filter(Boolean).map(source => `<div><a class="source-link" href="${html(source.url)}" target="_blank" rel="noopener noreferrer">${html(source.title)} &nearr;</a><span class="source-check">${html(source.review)} &middot; ${html(source.checked)}</span></div>`).join('');
  }
  function ring() {
    const value = core.percent(state.completed.length, lessons.length);
    return `<svg viewBox="0 0 132 132" class="progress-ring" role="img" aria-label="${value}% of lessons completed"><circle cx="66" cy="66" r="55" class="ring-track"/><circle cx="66" cy="66" r="55" class="ring-value" stroke-dasharray="345.575" stroke-dashoffset="${345.575 * (1 - value / 100)}"/><text x="66" y="65" class="ring-label">${value}%</text><text x="66" y="83" class="ring-sub">OF YOUR JOURNEY</text></svg>`;
  }
  function heroArt() {
    return `<svg class="hero-art" viewBox="0 0 410 285" role="img" aria-labelledby="hero-art-title"><title id="hero-art-title">An illustrated path from learning a concept to practicing a skill and celebrating progress</title><circle cx="232" cy="139" r="117" fill="#efcdbb" opacity=".3"/><circle cx="97" cy="244" r="6" fill="#c77555" opacity=".6"/><path class="draw-line" d="M75 202C30 85 167 44 218 76S370 125 316 216" fill="none" stroke="#be785b" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 7"/><g class="float-card" transform="rotate(-7 130 92)"><rect x="28" y="37" width="158" height="102" rx="13" class="art-paper"/><rect x="43" y="54" width="30" height="30" rx="8" fill="#eaf4ee"/><path d="M52 64h13m-13 5h10m-10 5h13" stroke="#29765d" stroke-width="2"/><text x="83" y="67" class="art-ink" font-family="sans-serif" font-size="10" font-weight="700">Learn something new</text><text x="83" y="80" class="art-muted" font-family="sans-serif" font-size="8">A small step, every day</text><rect x="43" y="98" width="126" height="5" rx="2" fill="#ebe9e6"/><rect x="43" y="109" width="87" height="5" rx="2" fill="#ebe9e6"/></g><g class="float-card"><rect x="172" y="98" width="177" height="127" rx="14" class="art-paper"/><rect x="188" y="114" width="28" height="28" rx="8" fill="#fbede6"/><path d="M195 133v-10m6 10v-6m6 6v-15" stroke="#b84229" stroke-width="2"/><text x="226" y="126" class="art-ink" font-family="sans-serif" font-size="10" font-weight="700">Your skills, growing</text><text x="226" y="139" class="art-muted" font-family="sans-serif" font-size="8">One lesson at a time</text><path d="M190 199h141" stroke="#e5e7e9"/><rect x="193" y="183" width="16" height="16" rx="3" fill="#e5b89e"/><rect x="222" y="170" width="16" height="29" rx="3" fill="#d99a79"/><rect x="251" y="157" width="16" height="42" rx="3" fill="#c97754"/><rect x="280" y="151" width="16" height="48" rx="3" fill="#b84229"/><rect x="309" y="140" width="16" height="59" rx="3" fill="#29765d"/></g><g class="float-card"><rect x="54" y="187" width="155" height="52" rx="13" class="art-paper"/><circle cx="80" cy="213" r="12" fill="#eaf4ee"/><path d="m75 213 3 3 6-7" stroke="#29765d" stroke-width="2" fill="none"/><text x="101" y="210" class="art-ink" font-family="sans-serif" font-size="10" font-weight="700">You can do this.</text><text x="101" y="224" class="art-muted" font-family="sans-serif" font-size="8">Let's start with the basics.</text></g><g transform="translate(314 42) rotate(12)"><rect width="47" height="48" rx="13" fill="#29765d"/><path d="m13 25 7 7 14-16" stroke="white" stroke-width="3" fill="none"/></g><path d="m241 35 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#be785b"/><path d="m367 201 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#29765d"/></svg>`;
  }
  const navItems = [['home','home','My learning'], ['path','route','Learning path'], ['labs','flask','Practice labs'], ['glossary','book','Simple glossary'], ['study','calendar','30-day plan'], ['resources','layers','Resource library'], ['progress','chart','My progress']];
  function navigation() {
    document.getElementById('navigation').innerHTML = navItems.map(([page, symbol, label]) => `<a href="#/${page}" class="nav-item ${route.page === page || (page === 'path' && route.page === 'lesson') || (page === 'labs' && route.page === 'lab') ? 'active' : ''}" ${route.page === page ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${page === 'labs' ? '<span class="nav-count">6</span>' : ''}</a>`).join('');
    const current = resumeLesson();
    const continueLink = document.getElementById('sidebar-continue');
    continueLink.href = `#/lesson/${current.id}`;
    continueLink.innerHTML = `${state.completed.length ? 'Keep learning' : 'Start learning'} ${icon('arrow')}`;
  }
  function homePage() {
    const current = resumeLesson();
    const completedModules = modules.filter(module => module.lessons.every(id => state.completed.includes(id))).length;
    const currentModule = moduleFor(current.id);
    const trackLevels = ['Beginner', 'Intermediate', 'Advanced'];
    return `<div class="welcome-line"><p>Your pace. Your path. Your next possibility.</p><span class="pill green">Free to learn. Always yours.</span></div>
      <section class="hero"><div><div class="eyebrow">A FRESH START, WITHOUT THE OVERWHELM</div><h1>A little learning.<br>A lot of <em>possibility.</em></h1><p>Go from “What is HubSpot?” to “I've got this.” Learn in plain English, try things safely, and build real skills. One small step at a time.</p><div class="button-row">${link(`${state.completed.length ? 'Continue learning' : 'Start my first lesson'} ${icon('arrow')}`, `#/lesson/${current.id}`, 'primary')}${link('Explore the path', '#/path', 'ghost')}</div><p class="hero-note">No experience needed &middot; No HubSpot account required here</p></div>${heroArt()}</section>
      <div class="stat-strip"><div class="stat">${icon('book')}<div><strong>48</strong><span>Bite-sized lessons</span></div></div><div class="stat">${icon('route')}<div><strong>16</strong><span>Guided modules</span></div></div><div class="stat">${icon('flask')}<div><strong>6</strong><span>Hands-on practice labs</span></div></div><div class="stat">${icon('heart')}<div><strong>Your pace</strong><span>No deadlines. No pressure.</span></div></div></div>
      <div class="dashboard-grid"><div><div class="section-heading"><div><h2>${state.completed.length ? 'Pick up where you left off' : 'Your first small step'}</h2><p>You don't need to know everything. Just start here.</p></div></div><article class="card continue-card"><div class="continue-icon">${icon(currentModule.icon)}</div><div class="continue-body"><div class="mini-meta">${tag(currentModule.level)}<span>MODULE ${String(modules.indexOf(currentModule)+1).padStart(2,'0')}</span></div><h3>${html(current.title)}</h3><p>${html(current.objective)}</p><div class="button-row">${link(`${state.lastLesson ? 'Open lesson' : 'Let’s begin'} ${icon('arrow')}`,`#/lesson/${current.id}`,'small primary')}<span class="mini-meta">${icon('clock')} ${current.minutes} min, including practice</span></div></div></article>
      <div class="section-heading"><div><h2>A clear path, from day one</h2><p>Start with the basics. Grow from there.</p></div><a class="text-link" href="#/path">View all modules &rarr;</a></div><div class="track-grid">${trackLevels.map((level,index) => `<a class="card track-card" href="#/path/${level.toLowerCase()}"><div class="module-symbol ${['green','blue','purple'][index]}">${icon(['compass','workflow','layers'][index])}</div>${tag(level)}<h3>${['Build your foundation','Put ideas into practice','Connect the bigger picture'][index]}</h3><p>${['Get comfortable with CRM, contacts, and your audience.','Create thoughtful emails, campaigns, and customer journeys.','Understand reports, operations, and advanced tools.'][index]}</p><div class="mini-meta">${modules.filter(module => module.level===level).length} modules <span>&middot;</span> ${modules.filter(module => module.level===level).length*3} lessons <span aria-hidden="true">&rarr;</span></div></a>`).join('')}</div></div>
      <aside class="dashboard-aside"><section class="card progress-card"><div class="section-heading"><h2>Your progress</h2>${icon('chart')}</div>${ring()}<h3>${state.completed.length ? 'Look how far you’ve come.' : 'Great things start small.'}</h3><p>${state.completed.length ? 'Every little step is adding up.' : 'Finish your first lesson to get going.'}</p><div class="progress-counts"><div><strong>${state.completed.length}<span> / 48</span></strong><span>Lessons finished</span></div><div><strong>${completedModules}<span> / 16</span></strong><span>Modules finished</span></div></div></section><section class="tip-card"><div class="eyebrow">${icon('info')} A LITTLE LEARNING TIP</div><h3>You can try before you sign up.</h3><p>Our practice labs use made-up data. Explore, make mistakes, and try again. Nothing touches a real account.</p><a class="text-link" href="#/labs">Take a look at the labs &rarr;</a></section></aside></div>
      <section class="bottom-banner"><div><h3>A simple plan. A little time each day.</h3><p>Try our 30-day guide, or take as long as you need.</p></div>${link(`See my 30-day plan ${icon('arrow')}`,'#/study','small')}</section>`;
  }
  function pathPage() {
    const filter = route.id ? route.id[0].toUpperCase()+route.id.slice(1) : pathFilter;
    const validFilter = ['All','Beginner','Intermediate','Advanced'].includes(filter) ? filter : 'All';
    return `${heading('YOUR LEARNING PATH','From “brand new” to “I can do this.”','Follow the modules in order, or revisit any lesson. Nothing is locked. Every lesson has a simple example and a chance to try.')}
    <div class="filters" aria-label="Filter by level">${['All','Beginner','Intermediate','Advanced'].map(level=>`<button class="chip" type="button" data-action="path-filter" data-value="${level}" aria-pressed="${validFilter===level}">${level==='All'?'All 16 modules':level}</button>`).join('')}</div>
    <div class="path-list">${modules.filter(module=>validFilter==='All'||module.level===validFilter).map(module=>`<article class="card module-card" id="module-${module.id}"><div class="module-head"><div class="module-symbol ${module.level==='Beginner'?'green':module.level==='Intermediate'?'blue':'purple'}">${icon(module.icon)}</div><div><div class="eyebrow">MODULE ${String(modules.indexOf(module)+1).padStart(2,'0')}</div><h2>${html(module.title)}</h2><p>${html(module.subtitle)}</p></div>${tag(module.level)}</div>${module.lessons.map((id,index)=>{const lesson=byId.get(id);return `<a class="lesson-link" href="#/lesson/${id}"><span class="lesson-number ${state.completed.includes(id)?'done':''}">${state.completed.includes(id)?icon('check'):index+1}</span><span>${html(lesson.title)}</span><span class="duration">${lesson.minutes} min</span>${icon('arrow')}</a>`;}).join('')}</article>`).join('')}</div>`;
  }
  const diagramSets = {
    journey: [['Discover','A useful tip helps someone find BrightPath.'],['Connect','A person chooses to share their details.'],['Help','The team answers questions and follows up.'],['Grow','A happy customer gets ongoing support.']],
    crm: [['Contact','A person: Maya Patel.'],['Company','Her workplace: Cedar Studio.'],['Deal','A possible sale: team workshop.'],['Ticket','A request for help: joining instructions.']],
    import: [['Prepare','Clean a small file and choose an identifier.'],['Map','Connect each column to the right property.'],['Review','Check create/update mode and overwrite rules.'],['Verify','Read the results and spot-check the records.']],
    lifecycle: [['Lead','Someone shows interest beyond subscribing.'],['MQL','Marketing agrees this person is ready for sales.'],['SQL','Sales confirms a real potential customer.'],['Customer','The agreed business outcome is reached.']],
    segments: [['Choose','Decide who should be in your audience.'],['Filter','Apply clear rules with AND or OR.'],['Exclude','Remove inappropriate sample records.'],['Review','Inspect actual matches, not only a total.']],
    capture: [['Page','Explain one useful offer.'],['Form','Ask for the smallest useful amount of information.'],['Consent','Explain how you will use that information.'],['Next step','Show a clear thank-you and next action.']],
    email: [['Plan','Choose one audience and one purpose.'],['Personalize','Use relevant details and a safe fallback.'],['Test','Check links, mobile, content, and recipients.'],['Review','Read the result without assuming opens equal interest.']],
    workflow: [['Trigger','What starts the process?'],['Check','Does this record qualify for this action?'],['Action','Take the right step on the right branch.'],['Monitor','Read history and watch for unexpected results.']],
    sales: [['Qualify','Confirm the need and buying process.'],['Propose','Make a clear offer.'],['Decide','Record won or lost honestly.'],['Handoff','Give service the context it needs.']],
    service: [['Receive','Save one clear issue as a ticket.'],['Own','Assign a responsible person.'],['Resolve','Explain the answer and confirm the outcome.'],['Learn','Improve the process using feedback.']],
    reports: [['Question','Start with a decision you need to make.'],['Define','Choose a measure, population, and date range.'],['Check','Watch for missing data and repeated records.'],['Act','Use the finding to choose a next step.']],
    change: [['Plan','Write down the change and who approves it.'],['Test','Use a safe practice setup and a small sample.'],['Release','Make only the approved change.'],['Monitor','Check the result and know how to roll back.']],
  };
  function diagram(type) {
    const steps = diagramSets[type] || diagramSets.journey;
    return `<figure class="diagram" data-diagram="${html(type)}"><figcaption>LEARN BY LOOKING &middot; Original simplified illustration, not a HubSpot screenshot</figcaption><div class="flow-steps">${steps.map(([label], index)=>`<button type="button" class="flow-node ${index===0?'active':''}" data-action="diagram-step" data-index="${index}" aria-pressed="${index===0}"><span>STEP ${index+1}</span>${html(label)}</button>${index<steps.length-1?'<span class="flow-arrow" aria-hidden="true">&rarr;</span>':''}`).join('')}</div><div class="flow-caption" aria-live="polite">${html(steps[0][1])}</div>${button(`Next step ${icon('arrow')}`,'diagram-next','small ghost')}</figure>`;
  }
  function quizMarkup(lesson) {
    return lesson.quiz.map((question,index)=>`<div class="quiz-card" data-question="${index}"><fieldset><legend>${index+1}. ${html(question.prompt)}</legend>${question.options.map((option,choice)=>`<label class="choice"><input type="radio" name="question-${index}" value="${choice}"><span>${html(option)}</span></label>`).join('')}</fieldset><div class="feedback" hidden aria-live="polite"></div></div>`).join('');
  }
  function lessonPage(id) {
    const lesson = byId.get(id);
    if (!lesson) return missingPage();
    const module = moduleFor(id), index = lessons.indexOf(lesson), done = state.completed.includes(id);
    const previous = lessons[index-1], next = lessons[index+1];
    state.lastLesson = id; persist();
    return `<div class="lesson-top"><a class="text-link" href="#/path">&larr; Back to learning path</a><div class="button-row">${button(`${icon('bookmark')} ${state.bookmarks.includes(id)?'Saved':'Save lesson'}`,'bookmark','small',`aria-pressed="${state.bookmarks.includes(id)}"`)}${button(`${icon('link')} Share lesson`,'share','small')}</div></div><div class="lesson-layout"><article class="lesson-content"><div class="eyebrow">MODULE ${String(modules.indexOf(module)+1).padStart(2,'0')} &middot; LESSON ${module.lessons.indexOf(id)+1} OF 3</div><h1 class="lesson-title">${html(lesson.title)}</h1><p class="lesson-lede">${html(lesson.objective)}</p><div class="mini-meta">${tag(module.level)}<span>${icon('clock')} ${lesson.minutes} min, including practice</span><span>${done?'Completed':'Go at your own pace'}</span></div><div class="access-note ${lesson.access==='Paid feature'?'paid':''}">${icon('info')}<div><strong>${html(lesson.access)}</strong><br>${html(lesson.accessNote)}</div></div><p class="source-note">Before you start: ${html(lesson.prerequisite)} HubSpot menus can vary. If the menu is hidden, open More first.</p>
    <section class="lesson-section" id="understand"><h2><span class="number-label">1</span>Understand it</h2>${lesson.explanation.map(paragraph=>`<p>${html(paragraph)}</p>`).join('')}${diagram(lesson.diagram)}</section>
    <section class="lesson-section" id="example"><h2><span class="number-label">2</span>See an example</h2><div class="example-box"><h3>At BrightPath Workshops</h3><p>${html(lesson.example)}</p></div></section>
    <section class="lesson-section" id="practice"><h2><span class="number-label">3</span>Try it, step by step</h2><ol class="steps">${lesson.steps.map(step=>`<li>${html(step)}</li>`).join('')}</ol><div class="callout"><strong>What you should see</strong>${html(lesson.outcome)}</div>${lesson.lab?link(`Open the ${html(labDefinitions.find(lab=>lab.id===lesson.lab)?.short || 'practice')} lab ${icon('arrow')}`,`#/lab/${lesson.lab}`,'primary'):''}${lesson.id==='launch-project'?projectMarkup():''}<div class="callout warning"><strong>Easy mistakes to avoid</strong><ul class="compact-list">${lesson.pitfalls.map(pitfall=>`<li>${html(pitfall)}</li>`).join('')}</ul></div><details class="deep-dive"><summary>Ready for a little more? Optional deeper dive</summary><p>${html(lesson.advanced)}</p></details></section>
    <section class="lesson-section" id="check"><h2><span class="number-label">4</span>Check your understanding</h2><p>No timer. No pressure. Choose an answer for each question, then see why it works.</p>${state.quizzes[id]?`<p class="source-note">Last saved result: ${state.quizzes[id].score}/${lesson.quiz.length}. Try again any time.</p>`:''}${quizMarkup(lesson)}<div id="quiz-summary" aria-live="polite"></div><div class="quiz-actions">${button('Check my answers','grade','primary')}${button('Try again','retry')}</div></section>
    <section class="lesson-section" id="recap"><h2>Your one-minute recap</h2><ul class="compact-list">${lesson.recap.map(item=>`<li>${html(item)}</li>`).join('')}</ul><div class="completion-box"><h3>${done?'You’ve finished this lesson.':'One more skill in your toolkit.'}</h3><p>Completion is your own check-in, separate from your quiz score. Mark it when you feel ready.</p><div class="button-row">${button(done?`${icon('check')} Mark as not finished`:`${icon('check')} Mark lesson complete`,'complete',done?'':'primary')}${next?link(`Next lesson ${icon('arrow')}`,`#/lesson/${next.id}`):link('See my progress','#/progress','primary')}</div></div></section>
    <section class="lesson-section" id="sources"><h2>Learn from the original source</h2><p class="source-note">Original teaching material, checked against the references below. Review methods are disclosed. This is not official HubSpot training; menus, features, and subscriptions can change.</p><div class="sources-list">${sourceLinks(lesson.sources)}</div></section>${previous?`<div class="section-divider"></div><a class="text-link" href="#/lesson/${previous.id}">&larr; Previous: ${html(previous.title)}</a>`:''}</article>
    <aside class="card lesson-outline"><div class="eyebrow">IN THIS LESSON</div><div class="outline-links">${[['understand','Understand it'],['example','See an example'],['practice','Try it'],['check','Check your answer'],['recap','Quick recap'],['sources','Official references']].map(([anchor,label],section)=>`<button type="button" data-action="scroll" data-value="${anchor}"><span>${String(section+1).padStart(2,'0')}</span>${label}</button>`).join('')}</div><div class="section-divider"></div><div class="eyebrow">YOUR PRIVATE NOTEBOOK</div><label class="notes-label" for="lesson-notes">What do you want to remember?</label><textarea id="lesson-notes" maxlength="4000" placeholder="Write it in your own words...">${html(state.notes[id]||'')}</textarea><p class="notes-hint" id="notes-status">Saved on this browser only. Use fictional examples.</p>${link(`${icon('book')} Look up a word`,'#/glossary','small')}${link(`${icon('flask')} Try a practice lab`,'#/labs','small')}</aside></div>`;
  }
  function glossaryPage() {
    return `${heading('WORDS, WITHOUT THE WORRY','A glossary that speaks your language.','Acronyms can wait. Understanding comes first. Search a word, then see it in a simple example.')}<label class="notes-label" for="glossary-search">Find a term</label><input type="search" class="search-input" id="glossary-search" placeholder="Try CRM, workflow, or marketing contact..."><p class="source-note" id="glossary-count" aria-live="polite"></p><div class="glossary-grid" id="glossary-results"></div>`;
  }
  function renderGlossary(query='') {
    const matches = glossary.filter(item=>`${item.term} ${item.meaning} ${item.example}`.toLowerCase().includes(query.toLowerCase()));
    document.getElementById('glossary-count').textContent = `${matches.length} terms`;
    document.getElementById('glossary-results').innerHTML = matches.length ? matches.map(item=>`<article class="card glossary-card"><h3>${html(item.term)}</h3><p>${html(item.meaning)}</p><p class="example">For example: ${html(item.example)}</p>${item.lesson?`<a class="text-link" href="#/lesson/${item.lesson}">See it in a lesson &rarr;</a>`:''}</article>`).join('') : '<div class="empty-state"><h2>No matching word yet</h2><p>Try a shorter word or browse the resource library.</p></div>';
  }
  function resourcesPage() {
    return `${heading('YOUR REFERENCE SHELF','Good sources. Useful little tools.','Practice with our fictional files, then go deeper with official HubSpot resources. External links open a new tab.')}<div class="split"><section class="card"><div class="module-symbol green">${icon('download')}</div><h2>Your practice starter kit</h2><p class="muted">Fictional BrightPath data only. Keep it in these labs or a training account; never send to the sample addresses.</p><div class="button-row" style="margin-top:18px">${button('Sample contacts CSV','download-contacts','small primary')}${button('Campaign checklist','download-checklist','small')}</div></section><section class="card"><div class="module-symbol blue">${icon('award')}</div><h2>Official Academy learning</h2><p class="muted">Academy learning materials are free. Some software certifications require paid-account practical exercises. Our quizzes are original, not official exam questions.</p><a class="text-link" href="https://academy.hubspot.com/courses" target="_blank" rel="noopener noreferrer">Browse HubSpot Academy &nearr;</a></section></div><div class="notice">References checked on ${course.reviewed}. Some checks used official search excerpts rather than a full page. The reference cards say which. Open the live guide before making changes in a real account.</div><div class="resource-grid">${Object.values(sources).map(source=>`<article class="card resource-card"><div class="eyebrow">${html(source.category)}</div><h3>${html(source.title)}</h3><a class="text-link" href="${html(source.url)}" target="_blank" rel="noopener noreferrer">Read official guide &nearr;</a><span class="source-check">${html(source.review)}<br>Checked ${source.checked}</span></article>`).join('')}</div>`;
  }
  function studyPage() {
    return `${heading('A LITTLE EACH DAY','30 days. A gentler way to learn.','Aim for 20–40 minutes a day. This is a suggested learning plan, not a promise of expertise. Take longer whenever you need.')}<div class="notice">Learn &rarr; try &rarr; explain it in your own words. Practice days are as important as lesson days.</div><div class="card">${studyPlan.map((day,index)=>`<article class="study-day"><div class="day-number"><small>DAY</small>${String(index+1).padStart(2,'0')}</div><div><h3>${html(day.title)}</h3><p>${html(day.task)}</p>${(day.lessons||[]).map(id=>`<a href="#/lesson/${id}">${html(byId.get(id).title)}</a>`).join('')}${day.lab?`<a href="#/lab/${day.lab}">Open practice lab &rarr;</a>`:''}</div></article>`).join('')}</div>`;
  }
  function progressPage() {
    const finished = state.completed.length===lessons.length;
    return `${heading('LOOK AT YOU GO','Every small step counts.','Your learning belongs to you. Progress and notes stay in this browser, not on a server. Export a backup to take them to another device.')}<div class="split"><section class="card progress-card">${ring()}<h3>${state.completed.length} of ${lessons.length} lessons complete</h3><p>Completed lessons are self-reported. Quiz scores are separate.</p><div class="button-row" style="justify-content:center;margin-top:20px">${button(`${icon('download')} Export progress`,'export','small primary')}${button('Import progress','import','small')}</div></section><section class="card"><h2>Your next small step</h2><p class="muted" style="margin:14px 0">${html(nextLesson().title)}</p>${link(`Continue learning ${icon('arrow')}`,`#/lesson/${nextLesson().id}`,'primary')}<div class="section-divider"></div><p class="source-note">Clearing browser data, using private browsing, or switching browsers can remove or separate progress. There is no account or cloud sync. Keep backups private if they contain notes.</p>${button('Reset my learning data','reset','small danger')}</section></div><section class="card" style="margin-top:24px"><h2>Your modules</h2>${modules.map(module=>{const count=module.lessons.filter(id=>state.completed.includes(id)).length;return `<div class="progress-module">${icon(count===3?'check':module.icon)}<div><h3>${html(module.title)}</h3><div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${count}" aria-label="${html(module.title)}"><span style="width:${count/3*100}%"></span></div></div><span>${count}/3</span></div>`;}).join('')}</section><div class="split" style="margin-top:24px"><section class="card"><h2>Saved for later</h2>${state.bookmarks.length?state.bookmarks.map(id=>`<div class="note-entry"><a href="#/lesson/${id}">${html(byId.get(id).title)}</a></div>`).join(''):'<p class="muted" style="margin-top:14px">Use Save lesson to keep something handy.</p>'}</section><section class="card"><h2>Quiz check-ins</h2>${Object.keys(state.quizzes).length?Object.entries(state.quizzes).map(([id,quiz])=>`<div class="note-entry"><a href="#/lesson/${id}">${html(byId.get(id).title)}</a><p>${quiz.score}/${byId.get(id).quiz.length} correct &middot; ${quiz.attempts} ${quiz.attempts===1?'attempt':'attempts'}</p></div>`).join(''):'<p class="muted" style="margin-top:14px">Try the short quiz at the end of any lesson.</p>'}</section></div><section class="card" style="margin-top:24px"><h2>Your notebook</h2>${Object.entries(state.notes).filter(([,note])=>note.trim()).map(([id,note])=>`<div class="note-entry"><a href="#/lesson/${id}">${html(byId.get(id).title)}</a><p>${html(note)}</p></div>`).join('')||'<p class="muted" style="margin-top:14px">Your lesson notes will appear here.</p>'}</section><section class="print-record" style="margin-top:24px"><div class="eyebrow">INDEPENDENT LEARNING RECORD</div><h2>${finished?'You completed the learning path.':'Your completion record is growing.'}</h2><p>${state.completed.length}/48 lessons &middot; ${Object.values(state.labs).filter(value=>value.passed).length}/6 practice labs</p><p>This is a self-paced completion record for HubSpot Learning Lab.<br>It is not an official HubSpot certification or proof of professional proficiency.</p>${button('Print my learning record','print','small')}</section>`;
  }
  function aboutPage() {
    return `${heading('A NOTE ON TRUST','Made to help you learn. Honestly.','Independent, approachable, and clear about what it can and cannot do.')}<article class="card readable"><h2>What this is</h2><p>HubSpot Learning Lab is an independent study companion for beginners, with marketing-first examples and a path into sales, service, reporting, and administration. It is not affiliated with, endorsed by, or certified by HubSpot. HubSpot is a trademark of its owner.</p><h2>How the content is made</h2><p>The explanations, examples, exercises, questions, and SVG illustrations are original. They summarize concepts from official HubSpot documentation; they are not copied Academy courses or exam questions. The resource library records each source, its review method, and the date checked: ${course.reviewed}.</p><p>Some reference checks used official search excerpts. The detailed procedures for records, properties, single-object imports, lifecycle stages, segments, forms, emails, campaigns, and workflows were reviewed against the official guides. This site has not been tested inside every HubSpot edition. Menus, names, seats, permissions, credits, and limits can change. Open the linked live guide before a real account change.</p><h2>Free learning, honest feature labels</h2><p>Every lesson and simulation here is available without payment. That does not mean every feature described is free inside HubSpot. Paid features have access notes. An account's subscriptions, assigned seats, permissions, region, and rollout status all affect availability. The live product catalog is the authority for packaging, not this site.</p><h2>Your privacy</h2><p>No login, analytics, tracking pixels, marketing forms, external fonts, or runtime API calls are included. The page uses browser-local IndexedDB for notes and progress, when available. It does not upload them. Sharing a lesson shares only its URL. Exported progress files contain your notes; keep those files private.</p><p>Do not type customer details, passwords, API tokens, private keys, or other sensitive information into the labs or notes. Only use fictional examples. Opening an official reference leaves this site and is subject to that site's privacy policies. GitHub Pages may log visitor IP addresses for security under GitHub's own privacy policy.</p><h2>Practice, not production</h2><p>All labs are simplified training simulations. They never send messages, charge a payment, import real contacts, or connect to HubSpot. BrightPath Workshops and the sample people are fictional. Domains ending in .example are reserved examples, not real recipients. Consent examples teach principles, not legal advice; ask your organization's privacy team about real requirements.</p><h2>Inclusive by design</h2><p>Keyboard controls, mobile layouts, readable contrast, labeled fields, and reduced-motion preferences are part of the experience. There are no sounds or timed quizzes. Use the appearance button at the top to switch theme or turn motion off.</p><div class="sources-list">${sourceLinks(['academy','catalog'])}<a class="source-link" href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages" target="_blank" rel="noopener noreferrer">GitHub Pages hosting and privacy notes &nearr;</a></div></article>`;
  }
  function projectMarkup() {
    return `<div class="card"><h3>Your project checklist</h3><div class="checklist">${projectChecklist.map((item,index)=>`<label class="check-row"><input type="checkbox" data-project="${index}" ${state.project.includes(index)?'checked':''}><span>${html(item)}</span></label>`).join('')}</div><details class="deep-dive"><summary>See an example solution</summary><p>BrightPath offers a free design workshop for small creative teams. Use one contact record per person, a dropdown for workshop interest, and Email as the contact import identifier. Build an active audience where interest is Design AND the person has the appropriate permission to receive the workshop email. Keep suppression checks separate and always required. Draft one registration page and one helpful email with a first-name fallback. Simulate a registration trigger, eligibility check, reminder delay, and a sales task only for an explicit team-training request. Create a deal for that request, not for every attendee. Track registrations and closed-won deals separately, with the date range and counting rule stated. Keep everything in draft or in our labs; do not send or publish for this project.</p></details></div>`;
  }
  const labDefinitions = [
    { id:'contact', short:'contact', title:'Your first contact record', description:'Change a few details and see how a customer record comes together.', icon:'users', lesson:'first-contact', goal:'Save a fictional contact with a name, an example email, and a workshop interest.' },
    { id:'import', short:'import mapping', title:'A place for every column', description:'Match spreadsheet columns to CRM properties without importing anything.', icon:'database', lesson:'map-import', goal:'Map all four sample columns to their correct contact properties.' },
    { id:'segments', short:'audience', title:'Who belongs in your audience?', description:'Try AND, OR, and exclusions. Watch your sample audience change.', icon:'filter', lesson:'and-or', goal:'Find Design contacts in London who are subscribed: Maya only.' },
    { id:'email', short:'email', title:'A more personal email', description:'Preview a friendly message, a fallback, and a careful pre-send check.', icon:'mail', lesson:'personalization', goal:'Preview a missing first name with a fallback, then finish the pre-send checklist.' },
    { id:'workflow', short:'workflow', title:'Follow the automation trail', description:'Test a trigger and a branch. See what happens before anything goes live.', icon:'workflow', lesson:'branches-delays', goal:'Test a subscribed registrant, an unsubscribed registrant, and someone who did not register.' },
    { id:'pipeline', short:'pipeline', title:'Make the pipeline make sense', description:'Move fictional deals and see why open pipeline is not won revenue.', icon:'columns', lesson:'deals-pipeline', goal:'Move Cedar Studio to Closed won and explain the effect on won value.' },
  ];
  function labsPage() { return `${heading('A SAFE SPACE TO TRY','Less guessing. More doing.','Six small practice labs. Made-up data. Real learning. No HubSpot account needed, and nothing you do here sends or publishes anything.')}<div class="lab-grid">${labDefinitions.map((lab,index)=>`<article class="card lab-card"><div class="module-symbol ${['green','blue','purple'][index%3]}">${icon(lab.icon)}</div><span class="tag">LAB ${String(index+1).padStart(2,'0')} ${state.labs[lab.id]?.passed?' · Completed':''}</span><h2>${lab.title}</h2><p>${lab.description}</p>${link(`Try this lab ${icon('arrow')}`,`#/lab/${lab.id}`,'small primary')}</article>`).join('')}</div>`; }
  function labPage(id) { const lab=labDefinitions.find(item=>item.id===id); return lab?`${heading('PRACTICE LAB',html(lab.title),html(lab.description))}<div class="notice">Training simulation only. No real account changes. ${html(lab.goal)}</div><div id="lab-content"></div>`:missingPage(); }
  function missingPage() { return `<div class="empty-state"><h1>This page took a wrong turn.</h1><p>The link may be incomplete. Your learning progress is still here.</p>${link('Back to my learning','#/home','primary')}</div>`; }

  function render() {
    route = core.parseRoute(location.hash);
    const page = { home:homePage, path:pathPage, lesson:()=>lessonPage(route.id), glossary:glossaryPage, resources:resourcesPage, study:studyPage, progress:progressPage, about:aboutPage, labs:labsPage, lab:()=>labPage(route.id) }[route.page] || missingPage;
    main.innerHTML = `<div class="reveal">${page()}</div>`;
    navigation();
    document.getElementById('breadcrumb').textContent = route.page==='lesson'?'Learning path / '+(moduleFor(route.id)?.title||'Lesson'):navItems.find(([page])=>page===route.page)?.[2]||'Learning Lab';
    document.title = `${main.querySelector('h1')?.textContent || 'My learning'} | HubSpot Learning Lab`;
    if(route.page==='glossary') renderGlossary();
    if(route.page==='lab') renderLab(route.id);
    closeMenu();
  }
  const emailChecks = ['The message has one useful purpose and a clear next step.', 'I checked the named and missing-name greeting.', 'I reviewed the real audience, preferences, and eligibility requirements on paper.', 'I know real sender verification, footer details, and unsubscribe controls are still required.', 'I would verify links, mobile layout, date, and timezone before an approved real send.'];
  let workflowResult = null;
  function labState(id) { if(!state.labs[id])state.labs[id]=core.initialLab(id); return state.labs[id]; }
  function options(values,value,empty='') {return (empty?`<option value="">${empty}</option>`:'')+values.map(item=>`<option value="${html(item)}" ${value===item?'selected':''}>${html(item)}</option>`).join('');}
  function labField(label,key,value,{type='text',max=120,items=null}={}) {
    return `<div class="field"><label for="lab-${key}">${label}</label>${items?`<select id="lab-${key}" data-lab-field="${key}">${options(items,value)}</select>`:`<input id="lab-${key}" type="${type}" value="${html(value)}" maxlength="${max}" data-lab-field="${key}" autocomplete="off">`}</div>`;
  }
  function recordPreview(value) {
    const initials=(value.firstName.trim().slice(0,1)+value.lastName.trim().slice(0,1)).toUpperCase()||'?';
    return `<div class="record-preview"><div class="record-header"><div class="record-avatar">${html(initials)}</div><div><h3>${html([value.firstName,value.lastName].filter(Boolean).join(' ')||'Your fictional contact')}</h3><p>${html(value.email||'No example email yet')}</p></div></div><div class="record-fields"><div><span>City</span><strong>${html(value.city)}</strong></div><div><span>Workshop interest</span><strong>${html(value.interest)}</strong></div><div><span>Record type</span><strong>Contact</strong></div><div><span>Environment</span><strong>Local simulation</strong></div></div></div>`;
  }
  function contactLab(value) {
    return `<div class="split"><section class="card lab-panel"><h2>A few useful details</h2><p class="source-note">Fictional examples only. Saving here does not create a HubSpot contact.</p><div class="field-row" style="margin-top:18px">${labField('First name','firstName',value.firstName)}${labField('Last name','lastName',value.lastName)}</div>${labField('Example email (must end in .example)','email',value.email,{type:'email'})}<div class="field-row">${labField('City','city',value.city,{items:['London','Delhi','Berlin']})}${labField('Workshop interest','interest',value.interest,{items:['Design','Analytics','Writing']})}</div>${button('Save practice contact','lab-contact','primary')}</section><section class="card lab-panel"><h2>Your record preview</h2><div id="contact-preview">${recordPreview(value)}</div><div class="callout"><strong>One person. Separate details.</strong>Each field has a meaning. Changing an interest updates the same person; it does not require a duplicate contact.</div></section></div>`;
  }
  function importLab(value) {
    const choices=[['','Choose a property'],['firstname','First name'],['lastname','Last name'],['email','Email'],['city','City'],['company','Company name'],['skip','Do not import']];
    return `<section class="card lab-panel"><h2>Match the meaning, not just the words</h2><p class="source-note">This fixed sample is already on the page. No file is uploaded. Email is the identifier for this contact-mapping exercise.</p><div class="table-wrap" style="margin:20px 0"><table><thead><tr><th scope="col">Spreadsheet column</th><th scope="col">Example value</th><th scope="col">HubSpot property</th></tr></thead><tbody>${core.importColumns.map(column=>`<tr><td><strong>${column.title}</strong></td><td>${column.example}</td><td><label class="sr-only" for="map-${column.key}">Property for ${column.title}</label><select id="map-${column.key}" data-map="${column.key}">${choices.map(([key,title])=>`<option value="${key}" ${value.mappings[column.key]===key?'selected':''}>${title}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>${button('Check my mapping','lab-import','primary')}<div class="callout"><strong>What happens in real life?</strong>An import also needs the right object, create/update mode, identifier, overwrite rules, permission, and post-import checks. This lab teaches only mapping.</div></section>`;
  }
  function segmentResults(value) {
    const members=core.segmentMembers(value), ids=members.map(contact=>contact.id);
    const rule=`(${value.interest?'Interest = '+value.interest:'any interest'} ${value.operator} ${value.city?'City = '+value.city:'any city'})${value.subscribedOnly?' AND subscribed':''}`;
    return `<div class="callout"><strong>${members.length} of ${core.contacts.length} sample contacts ${value.mode==='static'?'in the snapshot':'match'}</strong>${value.mode==='static'?(value.snapshot?'These members are frozen. Changing filters does not change this snapshot.':'Save a snapshot first. A static group does not fill itself as filters change.'):html(rule)}</div><div class="table-wrap"><table><thead><tr><th scope="col">Person</th><th scope="col">City</th><th scope="col">Interest</th><th scope="col">Subscribed</th><th scope="col">Result</th></tr></thead><tbody>${core.contacts.map(contact=>`<tr class="${ids.includes(contact.id)?'matched':''}"><td>${contact.firstName}</td><td>${contact.city}</td><td>${contact.interest}</td><td>${contact.subscribed?'Yes':'No'}</td><td>${ids.includes(contact.id)?'<span class="match-indicator">Included</span>':'Not included'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function segmentsLab(value) {
    return `<section class="card lab-panel"><h2>Build your rule, then inspect the people</h2><div class="field-row"><div class="field"><label for="segment-interest">Workshop interest</label><select id="segment-interest" data-lab-field="interest">${options(['Design','Analytics','Writing'],value.interest,'Any interest')}</select></div><div class="field"><label for="segment-city">City</label><select id="segment-city" data-lab-field="city">${options(['London','Delhi','Berlin'],value.city,'Any city')}</select></div></div><div class="field-row">${labField('Combine selected filters with','operator',value.operator,{items:['AND','OR']})}<div class="field"><label for="segment-mode">Membership behavior</label><select id="segment-mode" data-lab-field="mode"><option value="active" ${value.mode==='active'?'selected':''}>Active - keep matching the rule</option><option value="static" ${value.mode==='static'?'selected':''}>Static - use my saved snapshot</option></select></div></div><label class="check-row"><input type="checkbox" data-lab-field="subscribedOnly" ${value.subscribedOnly?'checked':''}><span>Always require subscribed = Yes after applying the interest/city rule.</span></label><p class="source-note" style="margin:10px 0">Blank filters are ignored. This subscription flag is a teaching shortcut, not complete real email eligibility or legal consent.</p><div class="button-row">${button('Save current rule as a static snapshot','lab-snapshot','small')}${button('Check the Maya-only challenge','lab-segments','small primary')}</div><div id="segment-results">${segmentResults(value)}</div></section>`;
  }
  function emailPreview(value) {
    return `<div class="email-preview"><div class="email-chrome"><div><strong>From:</strong> BrightPath Workshops (illustration)</div><div><strong>Subject:</strong> ${html(value.subject)}</div></div><div class="email-body"><div class="email-brand">BRIGHTPATH WORKSHOPS</div><h3>A small step toward clearer design.</h3><p><strong>${html(core.emailGreeting(value.firstName,value.fallback))}</strong></p><p style="margin-top:15px">${html(value.message)}</p><span class="mock-button">Explore the workshop &rarr;</span><div class="email-footer">Illustration only. This is not a working email or a send-ready template. A real marketing email needs the required business details and functioning subscription controls.</div></div></div>`;
  }
  function emailLab(value) {
    return `<div class="split"><section class="card lab-panel"><h2>A greeting that still works without a name</h2>${labField('Fictional first name (try leaving this blank)','firstName',value.firstName)}${labField('Fallback when no name is available','fallback',value.fallback,{max:60})}${labField('Subject line','subject',value.subject,{max:180})}<div class="field"><label for="lab-message">Message</label><textarea id="lab-message" data-lab-field="message" maxlength="1200">${html(value.message)}</textarea></div>${button('Preview a missing first name','lab-missing-name','small')}<p class="source-note" style="margin-top:13px">Plain text only. The lab does not execute HTML or accept HubSpot token syntax.</p></section><section class="card lab-panel"><h2>Your message preview</h2><div id="email-preview">${emailPreview(value)}</div></section></div><section class="card" style="margin-top:20px"><h2>Before a future real send</h2><div class="checklist">${emailChecks.map((item,index)=>`<label class="check-row"><input type="checkbox" data-email-check="${index}" ${value.checklist.includes(index)?'checked':''}><span>${item}</span></label>`).join('')}</div>${button('Check my preparation','lab-email','primary')}<p class="source-note" style="margin-top:13px">This self-review cannot verify consent, delivery, links, or a real account. Completing it sends nothing.</p></section>`;
  }
  function workflowLab(value) {
    const sample=core.contacts.find(contact=>contact.id===value.sampleId);
    return `<div class="split"><section class="card lab-panel"><h2>Choose a case to follow</h2><div class="field"><label for="workflow-sample">Fictional person</label><select id="workflow-sample" data-lab-field="sampleId">${core.contacts.map(contact=>`<option value="${contact.id}" ${contact.id===value.sampleId?'selected':''}>${contact.firstName} - ${contact.registered?'registered':'not registered'}, ${contact.subscribed?'subscribed':'not subscribed'}</option>`).join('')}</select></div><div class="field"><label for="workflow-delay">Simulated wait</label><select id="workflow-delay" data-lab-field="delayDays">${[1,2,3].map(day=>`<option value="${day}" ${day===value.delayDays?'selected':''}>${day} ${day===1?'day':'days'} (instant simulation)</option>`).join('')}</select></div><label class="check-row"><input type="checkbox" data-lab-field="salesTask" ${value.salesTask?'checked':''}><span>Simulate a sales-owner task only when an explicit team-training request exists.</span></label><div class="callout" id="workflow-person"><strong>${sample.firstName}'s facts</strong>Registered: ${sample.registered?'Yes':'No'}. Subscribed: ${sample.subscribed?'Yes':'No'}. Team-training request: ${sample.team?'Yes':'No'}.</div>${button('Run this simulation','lab-workflow','primary')}<p class="source-note" style="margin-top:13px">Try Maya, Noah, and Leo. Registered does not mean consented or qualified for every action.</p></section><section class="card lab-panel"><h2>Follow the decision trail</h2><div id="workflow-results" aria-live="polite">${workflowResult?workflowTrail(workflowResult):'<p class="muted">Choose a sample and run it. Every decision will be explained here.</p>'}</div></section></div>`;
  }
  function workflowTrail(result) {return `<ol class="flow-log">${result.steps.map((step,index)=>`<li style="--i:${index}">${html(step.text)}</li>`).join('')}</ol><p class="source-note">Outcome: ${html(result.outcome)}. Real re-enrollment, execution schedules, and delivery safeguards are outside this simplified simulator.</p>`;}
  function pipelineView(value) {
    const totals=core.pipelineTotals(value.stages),amount=number=>number.toLocaleString('en-US');
    return `<div class="metric-row" aria-live="polite"><div class="metric"><strong>${amount(totals.open)}</strong><span>Open value (fictional units)</span></div><div class="metric"><strong>${amount(totals.won)}</strong><span>Closed-won value (fictional units)</span></div><div class="metric"><strong>${totals.openCount}</strong><span>Open deals</span></div></div><div class="pipeline">${core.dealStages.map(stage=>`<section class="pipeline-column"><h3>${stage}</h3>${core.deals.filter(deal=>value.stages[deal.id]===stage).map(deal=>`<article class="deal-card"><h4>${deal.name}</h4><p>${deal.description}</p><strong>${amount(deal.amount)} units</strong><label for="deal-${deal.id}">Stage for ${deal.name}</label><select id="deal-${deal.id}" data-deal="${deal.id}">${options(core.dealStages,stage)}</select></article>`).join('')||'<p class="source-note">No sample deals here.</p>'}</section>`).join('')}</div>`;
  }
  function pipelineLab(value) {
    const answers=[['cash','2,400 units are guaranteed cash in the bank.'],['won-not-cash','Won value increases by 2,400 units; payment needs separate evidence.'],['contacts','Every related contact becomes a new independent deal.']];
    return `<section class="card lab-panel"><h2>Move based on evidence, not optimism</h2><p class="source-note">Sample scenario: Cedar Studio has accepted the team workshop under your agreed sales rules. No payment has been recorded. These are example stages, not universal HubSpot defaults.</p><div id="pipeline-view">${pipelineView(value)}</div><fieldset class="pipeline-question" id="pipeline-answer"><legend>If Cedar Studio is marked Closed won, what can you conclude?</legend>${answers.map(([answer,label])=>`<label class="choice"><input type="radio" name="pipeline-answer" data-lab-field="answer" value="${answer}" ${value.answer===answer?'checked':''}><span>${label}</span></label>`).join('')}</fieldset>${button('Check the deal and explanation','lab-pipeline','primary')}<div class="callout"><strong>Read the number with its definition.</strong>Open value excludes won and lost deals. Won value is not payment collected, accounting revenue, or an attribution claim.</div></section>`;
  }
  function renderLab(id) {
    const renderers={contact:contactLab,import:importLab,segments:segmentsLab,email:emailLab,workflow:workflowLab,pipeline:pipelineLab};
    if(!renderers[id])return;
    const value=labState(id),lab=labDefinitions.find(item=>item.id===id);
    document.getElementById('lab-content').innerHTML=`<div class="lesson-top"><a class="text-link" href="#/labs">&larr; All practice labs</a><a class="text-link" href="#/lesson/${lab.lesson}">Read the related lesson &rarr;</a></div>${renderers[id](value)}<div id="lab-feedback" aria-live="polite">${value.passed?'<div class="callout"><strong>Challenge completed on a previous attempt.</strong>You can keep experimenting. Your draft settings are saved separately from that completion.</div>':''}</div><div class="button-row" style="margin-top:20px">${button('Reset this lab','lab-reset','small ghost')}</div>`;
  }
  function labFeedback(message,success=false) {
    document.getElementById('lab-feedback').innerHTML=`<div class="callout ${success?'':'warning'}"><strong>${success?'You’ve got it.':'A useful next check.'}</strong>${html(message)}</div>`;
  }
  function passLab(message) {
    const value=labState(route.id),wasPassed=value.passed;value.passed=true;persist();labFeedback(message,true);if(!wasPassed)celebrate();
  }
  function refreshLabPreview(key) {
    const value=labState(route.id);
    if(route.id==='contact')document.getElementById('contact-preview').innerHTML=recordPreview(value);
    if(route.id==='email'){document.getElementById('email-preview').innerHTML=emailPreview(value);if(!value.firstName.trim())value.missingPreviewed=true;}
    if(route.id==='segments')document.getElementById('segment-results').innerHTML=segmentResults(value);
    if(route.id==='workflow'){
      const sample=core.contacts.find(contact=>contact.id===value.sampleId);
      document.getElementById('workflow-person').innerHTML=`<strong>${sample.firstName}'s facts</strong>Registered: ${sample.registered?'Yes':'No'}. Subscribed: ${sample.subscribed?'Yes':'No'}. Team-training request: ${sample.team?'Yes':'No'}.`;
      workflowResult=null;document.getElementById('workflow-results').innerHTML='<p class="muted">Settings changed. Run again to see the new decision trail.</p>';
    }
  }
  function handleLabField(target) {
    if(route.page!=='lab'||!labDefinitions.some(lab=>lab.id===route.id))return;
    const value=labState(route.id);
    if(target.matches('[data-lab-field]')){
      const key=target.dataset.labField;
      if(!Object.hasOwn(value,key))return;
      value[key]=target.type==='checkbox'?target.checked:key==='delayDays'?Number(target.value):target.value;
      refreshLabPreview(key);persist();
    }
    if(target.matches('[data-map]')){value.mappings[target.dataset.map]=target.value;persist();}
    if(target.matches('[data-email-check]')){const index=Number(target.dataset.emailCheck);value.checklist=target.checked?[...new Set([...value.checklist,index])]:value.checklist.filter(item=>item!==index);persist();}
    if(target.matches('[data-deal]')){value.stages[target.dataset.deal]=target.value;persist();document.getElementById('pipeline-view').innerHTML=pipelineView(value);document.getElementById(`deal-${target.dataset.deal}`)?.focus();}
  }
  function openDialog(title, body) {
    opener = document.activeElement;
    document.getElementById('dialog-content').innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${html(title)}</h2><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>${body}`;
    if(!dialog.open) dialog.showModal();
  }
  function closeDialog() { dialog.close(); opener?.focus(); }
  function syncMenu() {
    const open = mobileNavigation.matches && sidebar.classList.contains('open');
    sidebar.inert = mobileNavigation.matches && !open;
    if (sidebar.inert) sidebar.setAttribute('aria-hidden','true');
    else sidebar.removeAttribute('aria-hidden');
    menuToggle.setAttribute('aria-expanded',String(open));
    menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  }
  function closeMenu() {
    if (mobileNavigation.matches && sidebar.contains(document.activeElement)) menuToggle.focus();
    sidebar.classList.remove('open');
    syncMenu();
  }
  function openSearch() {
    openDialog('What would you like to learn?', '<label class="notes-label" for="lesson-search">Search all 48 lessons</label><input id="lesson-search" class="search-input" type="search" placeholder="Try email, contacts, or workflow..."><p id="search-count" class="source-note" aria-live="polite"></p><div id="search-results" class="search-results"></div>');
    const input=document.getElementById('lesson-search');
    const update=()=>{const matches=core.searchLessons(lessons,input.value);document.getElementById('search-count').textContent=`${matches.length} lessons found`;document.getElementById('search-results').innerHTML=matches.length?matches.map(lesson=>`<a class="search-result" href="#/lesson/${lesson.id}" data-action="search-result"><strong>${html(lesson.title)}</strong><span>${html(moduleFor(lesson.id).title)} &middot; ${lesson.minutes} min</span></a>`).join(''):'<p class="muted">No matches yet. Try a shorter word, or look in the glossary.</p>';};
    input.addEventListener('input',update);update();input.focus();
  }
  function applyPreferences() { document.documentElement.dataset.theme=state.preferences.theme;document.documentElement.dataset.motion=state.preferences.motion; }
  function openSettings() {
    openDialog('Make yourself comfortable',`<div class="settings-group"><label for="theme-setting">Appearance</label><select id="theme-setting">${[['system','Follow my device'],['light','Light'],['dark','Dark']].map(([value,label])=>`<option value="${value}" ${state.preferences.theme===value?'selected':''}>${label}</option>`).join('')}</select></div><div class="settings-group"><label for="motion-setting">Animation</label><select id="motion-setting"><option value="system" ${state.preferences.motion==='system'?'selected':''}>Gentle motion (respect my device preference)</option><option value="off" ${state.preferences.motion==='off'?'selected':''}>Turn all motion off</option></select><p>No sound effects, ever. Your device's reduced-motion setting always wins.</p></div>`);
  }
  function celebrate() {
    if(state.preferences.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const layer=document.createElement('div');layer.className='confetti';layer.setAttribute('aria-hidden','true');
    layer.innerHTML=Array.from({length:24},(_,index)=>`<span style="--x:${(index*41)%100}%;--color:${['#b84229','#29765d','#d7a27b','#386b98'][index%4]};--delay:${(index%5)*.06}s"></span>`).join('');
    document.body.append(layer);setTimeout(()=>layer.remove(),2200);
  }
  function download(name,content,type='text/plain;charset=utf-8') {
    const url=URL.createObjectURL(new Blob([content],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function gradeQuiz() {
    const lesson=byId.get(route.id), answers=lesson.quiz.map((_,index)=>main.querySelector(`input[name="question-${index}"]:checked`));
    if(answers.some(answer=>!answer)){toast('Choose an answer for each question first.');return;}
    let score=0;
    lesson.quiz.forEach((question,index)=>{const answer=Number(answers[index].value),correct=answer===question.answer;if(correct)score++;const card=main.querySelector(`[data-question="${index}"]`);card.querySelectorAll('.choice').forEach((choice,choiceIndex)=>{choice.classList.toggle('correct',choiceIndex===question.answer);choice.classList.toggle('wrong',choiceIndex===answer&&!correct);});const feedback=card.querySelector('.feedback');feedback.hidden=false;feedback.innerHTML=`<strong>${correct?'That’s right.':'A useful thing to learn.'}</strong>${html(question.explanation)}`;});
    state.quizzes[route.id]={score,answers:answers.map(answer=>Number(answer.value)),attempts:(state.quizzes[route.id]?.attempts||0)+1};persist();
    document.getElementById('quiz-summary').innerHTML=`<div class="callout"><strong>${score} of ${lesson.quiz.length} correct.</strong>${score===lesson.quiz.length?'You’re making connections. Review the recap when you’re ready.':'Read the explanations, then try again. There is no penalty.'}</div>`;
  }
  document.addEventListener('click',async event=>{
    const target=event.target.closest('[data-action]');if(!target)return;
    const action=target.dataset.action;
    if(action==='close-dialog'){closeDialog();return;}
    if(action==='search-result'){closeDialog();return;}
    if(action==='path-filter'){pathFilter=target.dataset.value;if(route.id)location.hash='#/path';else render();return;}
    if(action==='scroll'){const section=document.getElementById(target.dataset.value);if(section){section.setAttribute('tabindex','-1');section.focus({preventScroll:true});section.scrollIntoView();}return;}
    if(action==='diagram-step'||action==='diagram-next'){
      const figure=target.closest('[data-diagram]'),nodes=[...figure.querySelectorAll('.flow-node')];const index=action==='diagram-step'?Number(target.dataset.index):(nodes.findIndex(node=>node.classList.contains('active'))+1)%nodes.length;
      nodes.forEach((node,nodeIndex)=>{node.classList.toggle('active',nodeIndex===index);node.setAttribute('aria-pressed',String(nodeIndex===index));});figure.querySelector('.flow-caption').textContent=(diagramSets[figure.dataset.diagram]||diagramSets.journey)[index][1];return;
    }
    if(action==='bookmark'){const id=route.id;state.bookmarks=state.bookmarks.includes(id)?state.bookmarks.filter(item=>item!==id):[...state.bookmarks,id];persist();target.innerHTML=`${icon('bookmark')} ${state.bookmarks.includes(id)?'Saved':'Save lesson'}`;target.setAttribute('aria-pressed',String(state.bookmarks.includes(id)));toast(state.bookmarks.includes(id)?'Saved to My progress.':'Removed from saved lessons.');return;}
    if(action==='complete'){const id=route.id,wasDone=state.completed.includes(id);state.completed=wasDone?state.completed.filter(item=>item!==id):[...state.completed,id];persist();render();document.getElementById('recap')?.scrollIntoView();if(!wasDone){celebrate();toast('One more small step. Lesson marked complete.');}return;}
    if(action==='grade'){gradeQuiz();return;}
    if(action==='retry'){render();document.getElementById('check')?.scrollIntoView();toast('Fresh answers, fresh start. Your previous score stays until you check again.');return;}
    if(action==='share'){const shareURL=new URL(location.href);shareURL.search='';const value=shareURL.href;try{if(!['https:','http:'].includes(shareURL.protocol))throw Error('Local file');await navigator.clipboard.writeText(value);toast('Lesson link copied. Your notes and progress are not included.');}catch{openDialog('Share this lesson',`<p class="notice">${shareURL.protocol==='file:'?'This is a local file. Publish to GitHub Pages to share it with others.':'Copy this lesson URL. It does not include notes or progress.'}</p><label for="share-url" class="notes-label">Lesson link</label><input id="share-url" class="search-input" readonly value="${html(value)}">`);document.getElementById('share-url').select();}return;}
    if(action==='print'){window.print();return;}
    if(action==='download-contacts'){downloadContacts();return;}
    if(action==='download-checklist'){download('brightpath-campaign-checklist.txt','BrightPath Workshops - fictional learning project\n\n'+projectChecklist.map((item,index)=>`${index+1}. ${item}`).join('\n')+'\n\nKeep all work in draft. Do not send messages to sample addresses.');return;}
    await handleAdditionalAction(action,target);
  });
  function downloadContacts() { download('brightpath-practice-contacts.csv',core.sampleCSV(),'text/csv;charset=utf-8'); }
  async function handleAdditionalAction(action) {
    if(action.startsWith('lab-')){
      const value=labState(route.id);
      if(action==='lab-contact'){const errors=core.validateContact(value);if(errors.length)labFeedback(errors.join(' '));else passLab('You saved a fictional contact with clearly named properties. No HubSpot record was created.');}
      if(action==='lab-import'){const results=core.checkMapping(value.mappings),wrong=results.filter(result=>!result.correct);if(wrong.length)labFeedback(wrong.map(result=>result.message).join(' '));else passLab('All four columns match the right properties. Email is the identifying field in this contact-import example.');}
      if(action==='lab-snapshot'){value.snapshot=core.filterContacts(value).map(contact=>contact.id);value.mode='static';persist();renderLab(route.id);labFeedback('Snapshot saved from the current rule. Change the filters to see that static membership stays fixed.',true);}
      if(action==='lab-segments'){const matches=core.segmentMembers(value);if(value.mode==='active'&&value.operator==='AND'&&value.interest==='Design'&&value.city==='London'&&value.subscribedOnly&&matches.length===1&&matches[0].id==='maya')passLab('Maya is the only match. Noah shares the interest and city but does not pass the subscribed-only check.');else labFeedback('For this challenge, use Active, Design, London, AND, and require subscribed = Yes. Inspect Maya and Noah to understand the difference.');}
      if(action==='lab-missing-name'){value.firstName='';value.missingPreviewed=true;persist();renderLab(route.id);document.getElementById('lab-firstName')?.focus();}
      if(action==='lab-email'){if(value.missingPreviewed&&value.checklist.length===emailChecks.length&&value.fallback.trim()&&value.subject.trim()&&value.message.trim())passLab('You checked the missing-name fallback and completed a thoughtful pre-send self-review. Nothing was sent and this is not a live deliverability check.');else labFeedback('Try the missing-name preview, enter a useful fallback, subject, and message, and review every checklist item. This is a preparation exercise, not authorization to send.');}
      if(action==='lab-workflow'){const sample=core.contacts.find(contact=>contact.id===value.sampleId);workflowResult=core.simulateWorkflow(sample,value);value.runs=[...new Set([...value.runs,workflowResult.outcome])];document.getElementById('workflow-results').innerHTML=workflowTrail(workflowResult);persist();if(value.runs.includes('eligible')&&value.runs.includes('blocked')&&value.runs.includes('not-enrolled'))passLab('You tested an eligible registrant, an unsubscribed registrant, and someone who never enrolled. You have checked more than the happy path.');else labFeedback(`Run recorded. Test all three outcomes: eligible (Maya), blocked (Noah), and not enrolled (Leo). Seen so far: ${value.runs.join(', ')}.`,true);}
      if(action==='lab-pipeline'){if(value.stages.cedar==='Closed won'&&value.answer==='won-not-cash')passLab('Cedar Studio contributes 2,400 units to won value. That records a sales outcome, not proof of collected cash.');else labFeedback('Move Cedar Studio to Closed won under the stated scenario, then choose the explanation that keeps won value separate from payment.');}
      if(action==='lab-reset')openDialog('Reset this practice lab?',`<p class="notice">This resets only the ${html(labDefinitions.find(lab=>lab.id===route.id).short)} lab and its completion. Other lessons and notes stay unchanged.</p><div class="button-row">${button('Reset this lab','confirm-lab-reset','primary')}${button('Keep my work','close-dialog')}</div>`);
      return;
    }
    if(action==='confirm-lab-reset'){state.labs[route.id]=core.initialLab(route.id);workflowResult=null;persist();closeDialog();renderLab(route.id);toast('This practice lab has been reset.');return;}
    await handleProgressAction(action);
  }
  async function handleProgressAction(action) {
    if(action==='export'){
      await saveNow();
      download('hubspot-learning-progress.json',JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'application/json');
      toast('Backup downloaded. It includes your notes and practice inputs; keep it private.');
      return;
    }
    if(action==='import'){const input=document.getElementById('progress-file');input.value='';input.click();return;}
    if(action==='confirm-import'){
      if(!pendingImport)return;
      clearTimeout(saveTimer);state=pendingImport;pendingImport=null;workflowResult=null;
      applyPreferences();closeDialog();await saveNow();render();toast('Learning backup imported on this device.');return;
    }
    if(action==='reset'){
      openDialog('Start a fresh learning record?',`<p class="notice">This removes your completed lessons, quiz results, notes, bookmarks, lab drafts, and preferences for this site in this browser. It does not change HubSpot or other websites. Export a backup first if you want to keep your work.</p><div class="button-row">${button('Export a backup','export')}${button('Reset my learning record','confirm-reset','danger')}${button('Keep my progress','close-dialog')}</div>`);return;
    }
    if(action==='confirm-reset'){
      clearTimeout(saveTimer);state=core.blankState();pendingImport=null;workflowResult=null;pathFilter='All';
      applyPreferences();closeDialog();await saveNow();render();toast('Your learning record has been reset on this device.');return;
    }
  }
  document.getElementById('progress-file').addEventListener('change',async event=>{
    const readId=++activeImportRead,file=event.target.files[0];pendingImport=null;if(!file)return;
    try{
      if(file.size>core.maxImportBytes)throw new Error('Choose a JSON backup smaller than 1 MB.');
      const candidate=core.parseBackup(await file.text(),lessons,projectChecklist.length);
      if(readId!==activeImportRead)return;
      pendingImport=candidate;
      openDialog('Replace this device’s learning record?',`<p class="notice">The validated backup has ${candidate.completed.length} completed lessons, ${Object.keys(candidate.quizzes).length} quiz results, and ${Object.values(candidate.notes).filter(note=>note.trim()).length} notes. Importing replaces the current record rather than merging it. Nothing is uploaded.</p><div class="button-row">${button('Export current progress first','export')}${button('Import and replace','confirm-import','primary')}${button('Cancel','close-dialog')}</div>`);
    }catch(error){toast(error.message||'That file could not be imported. Your current progress is unchanged.');}
    finally{event.target.value='';}
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='lesson-notes'){state.notes[route.id]=event.target.value;persist();document.getElementById('notes-status').textContent='Note updated. Export a backup from My progress.';}
    if(event.target.id==='glossary-search')renderGlossary(event.target.value);
    if(event.target.matches('input[data-lab-field],textarea[data-lab-field]')&&event.target.type!=='checkbox')handleLabField(event.target);
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='theme-setting'){state.preferences.theme=event.target.value;applyPreferences();persist();}
    if(event.target.id==='motion-setting'){state.preferences.motion=event.target.value;applyPreferences();persist();}
    if(event.target.matches('[data-project]')){const value=Number(event.target.dataset.project);state.project=event.target.checked?[...new Set([...state.project,value])]:state.project.filter(item=>item!==value);persist();}
    if(event.target.matches('select[data-lab-field],input[type=checkbox][data-lab-field],[data-map],[data-email-check],[data-deal]'))handleLabField(event.target);
  });
  document.getElementById('menu-toggle').innerHTML=icon('menu');
  document.getElementById('search-icon').innerHTML=icon('search');
  document.getElementById('settings-open').innerHTML=icon('settings');
  menuToggle.addEventListener('click',()=>{
    if(sidebar.classList.contains('open'))closeMenu();
    else{sidebar.classList.add('open');syncMenu();sidebar.querySelector('.nav-item')?.focus();}
  });
  mobileNavigation.addEventListener('change',closeMenu);
  document.querySelector('.skip-link').addEventListener('click',event=>{
    event.preventDefault();closeMenu();main.focus({preventScroll:true});main.scrollIntoView();
  });
  document.getElementById('search-open').addEventListener('click',openSearch);
  document.getElementById('settings-open').addEventListener('click',openSettings);
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!dialog.open&&!event.target.matches('input,textarea,select')){event.preventDefault();openSearch();}if(event.key==='Escape')closeMenu();});
  dialog.addEventListener('close',()=>{pendingImport=null;opener?.focus();});
  document.addEventListener('click',event=>{if(!event.target.closest('.sidebar,#menu-toggle'))closeMenu();});
  window.addEventListener('hashchange',()=>{if(!storageReady)return;if(dialog.open)dialog.close();render();window.scrollTo(0,0);main.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow();});
  window.addEventListener('pagehide',()=>{saveNow();});
  syncMenu();
  main.setAttribute('aria-busy','true');
  main.innerHTML='<div class="card"><h1 style="font-size:26px">Getting your learning space ready...</h1><p class="muted">Checking this browser for your saved progress. No account or network request needed.</p></div>';
  loadProgress();
})();