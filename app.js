// app.js
(function(){
  // --- Elements ---
  const cubes = document.getElementById('cubes');
  const cubeEls = Array.from(cubes.querySelectorAll('.cube'));
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const stopBtn = document.getElementById('stopBtn');
  const exportZipBtn = document.getElementById('exportZip');
  const enableSearch = document.getElementById('enableSearch');
  const searchInput = document.getElementById('searchInput');
  const toast = document.getElementById('toast');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const progressBar = document.getElementById('progressBar');
  const loadedCount = document.getElementById('loadedCount');
  const foundCount = document.getElementById('foundCount');
  const totalCount = document.getElementById('totalCount');
  const tableBody = document.querySelector('#table-demo tbody');
  const passToCleanerBtn = document.getElementById('passToCleaner');
  const cleanerCard = document.getElementById('cleanerCard');
  const tableCleanedBody = document.querySelector('#table-cleaned tbody');
  const cleanUrlsBtn = document.getElementById('cleanUrlsBtn');
  const exportCleanedZipBtn = document.getElementById('exportCleanedZip');
  const bgUpload = document.getElementById('bgUpload');

  const tabAnalyzer = document.getElementById('tabAnalyzer');
  const tabCleaner = document.getElementById('tabCleaner');
  const tabProjects = document.getElementById('tabProjects');
  const analyzerCard = document.getElementById('analyzerCard');
  const projectsCard = document.getElementById('projectsCard');

  // --- State ---
  let activeTypes = new Set(['emails','users','numbers']);
  let isStopped = false;
  let matchedLines = [];
  let cleanedMatches = [];
  let cleanerTypes = new Set(['emails','users','numbers']);

  // --- Helper ---
  function showToast(msg,time=2200){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> toast.classList.remove('show'),time);
  }

  function switchTab(tab){
    analyzerCard.style.display = tab==='analyzer'?'block':'none';
    cleanerCard.style.display = tab==='cleaner'?'block':'none';
    projectsCard.style.display = tab==='projects'?'block':'none';
    tabAnalyzer.classList.toggle('active', tab==='analyzer');
    tabCleaner.classList.toggle('active', tab==='cleaner');
    tabProjects.classList.toggle('active', tab==='projects');
  }

  tabAnalyzer.addEventListener('click', ()=>switchTab('analyzer'));
  tabCleaner.addEventListener('click', ()=>switchTab('cleaner'));
  tabProjects.addEventListener('click', ()=>switchTab('projects'));

  // --- Cube toggles ---
  function toggleCube(cube, setRef){
    const t = cube.dataset.type;
    if(setRef.has(t)){ setRef.delete(t); cube.classList.remove('on'); showToast(`${t} disabled`); }
    else { setRef.add(t); cube.classList.add('on'); showToast(`${t} enabled`); }
  }

  cubes.addEventListener('click', e=>{
    const cube = e.target.closest('.cube');
    if(!cube) return;
    toggleCube(cube, activeTypes);
  });

  // Cleaner cubes
  const cleanerCubes = Array.from(document.querySelectorAll('#cleanerOptions .cube'));
  cleanerCubes.forEach(cube=>{
    cube.addEventListener('click', ()=>{ toggleCube(cube, cleanerTypes); });
  });

  // --- File analyze ---
  analyzeBtn.addEventListener('click', ()=>{
    const file = fileInput.files[0];
    if(!file){ showToast('Please upload a file'); return; }

    const reader = new FileReader();
    reader.onload = e=>{
      const content = e.target.result;
      const lines = content.split('\n').filter(l=>l.trim()!=='');

      totalCount.textContent = lines.length;
      loadedCount.textContent = 0;
      foundCount.textContent = 0;
      progressBar.value = 0;
      isStopped = false;
      matchedLines = [];

      const target = enableSearch.checked ? searchInput.value.trim().toLowerCase() : '';

      lines.forEach((line,index)=>{
        if(isStopped) return;
        let matches = [];

        // --- Keep original line including URLs / prefixes ---
        if(activeTypes.has('emails')){
          if(line.match(/[^\s@:]+@[^\s@:]+\:[^\s,]+/gi)) matches.push(line);
        }
        if(activeTypes.has('users')){
          if(line.match(/[^\s@:]+:[^\s,]+/gi)) matches.push(line);
        }
        if(activeTypes.has('numbers')){
          if(line.match(/\b\d+:[^\s,]+/g)) matches.push(line);
        }

        if(target) matches = matches.filter(m=>m.toLowerCase().includes(target));
        if(matches.length>0) matchedLines.push(...matches);

        loadedCount.textContent = index+1;
        foundCount.textContent = matchedLines.length;
        progressBar.value = ((index+1)/lines.length)*100;
      });

      // Update table
      tableBody.innerHTML='';
      matchedLines.forEach(val=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`<td><input type="checkbox" checked></td><td>Matched</td><td>${val}</td>`;
        tableBody.appendChild(tr);
      });

      showToast('Analysis complete');
    };
    reader.readAsText(file);
  });

  // --- Clear / Stop / Export ---
  clearBtn.addEventListener('click', ()=>{
    fileInput.value=''; fileInfo.textContent='No file uploaded';
    tableBody.innerHTML=''; progressBar.value=0; loadedCount.textContent=0; foundCount.textContent=0;
    matchedLines = [];
    showToast('Cleared');
  });

  stopBtn.addEventListener('click', ()=>{
    isStopped = true;
    showToast('Stopped');
  });

  exportZipBtn.addEventListener('click', ()=>{
    if(matchedLines.length===0){ showToast('No matches'); return; }
    const zip = new JSZip();
    zip.file('matches.txt', matchedLines.join('\n'));
    zip.generateAsync({type:'blob'}).then(content=>{
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url; a.download='matches.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
    showToast('Exported');
  });

  enableSearch.addEventListener('change', ()=>{
    searchInput.disabled = !enableSearch.checked;
    if(enableSearch.checked){ showToast('Target search enabled'); searchInput.focus(); }
    else{ searchInput.value=''; showToast('Target search disabled'); }
  });

  // --- Pass to Cleaner ---
  passToCleanerBtn.addEventListener('click', ()=>{
    if(matchedLines.length===0){ showToast('No matches to send'); return; }
    cleanedMatches = [...matchedLines]; // Keep full lines including URLs
    switchTab('cleaner');
    updateCleanedTable();
    showToast('Sent to Cleaner');
  });

  // --- Cleaner ---
  function updateCleanedTable(){
    tableCleanedBody.innerHTML='';
    cleanedMatches.forEach(val=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><input type="checkbox" checked></td><td>Cleaned</td><td>${val}</td>`;
      tableCleanedBody.appendChild(tr);
    });
  }

  cleanUrlsBtn.addEventListener('click', ()=>{
    if(!cleanedMatches || cleanedMatches.length===0){ showToast('No data'); return; }

    const seen = new Set();
    const typeRegexes = [];
    if(cleanerTypes.has('emails')) typeRegexes.push(/[^\s@:]+@[^\s@:]+\:[^\s,]+/);
    if(cleanerTypes.has('users')) typeRegexes.push(/[^\s@:]+:[^\s,]+/);
    if(cleanerTypes.has('numbers')) typeRegexes.push(/\b\d+:[^\s,]+/);

    cleanedMatches = cleanedMatches.map(line=>{
      for(const r of typeRegexes){
        const m = line.match(r);
        if(m) return m[0]; // Keep only the matched regex part
      }
      return null;
    }).filter(line=>line!==null).filter(line=>{
      if(seen.has(line)) return false;
      seen.add(line);
      return true;
    });

    updateCleanedTable();
    showToast(`Cleaned, removed duplicates: ${matchedLines.length - cleanedMatches.length}`);
  });

  exportCleanedZipBtn.addEventListener('click', ()=>{
    if(!cleanedMatches || cleanedMatches.length===0){ showToast('No cleaned matches'); return; }
    const zip = new JSZip();
    zip.file('cleaned_matches.txt', cleanedMatches.join('\n'));
    zip.generateAsync({type:'blob'}).then(content=>{
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url; a.download='cleaned_matches.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
    showToast('Exported cleaned matches');
  });

  // --- Background upload ---
  bgUpload.addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      document.getElementById('mainContent').style.backgroundImage=`url(${ev.target.result})`;
      document.getElementById('mainContent').style.backgroundSize='cover';
      document.getElementById('mainContent').style.backgroundPosition='center';
      showToast('Background updated');
    };
    reader.readAsDataURL(file);
  });

  // Accessibility keyboard for cubes
  cubeEls.forEach(c=>{
    c.setAttribute('tabindex','0');
    c.addEventListener('keydown', e=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); c.click(); }
    });
  });
  cleanerCubes.forEach(c=>{
    c.setAttribute('tabindex','0');
    c.addEventListener('keydown', e=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); c.click(); }
    });
  });

  setTimeout(()=>showToast('UI loaded'),600);
})();
