var selectedFile = null;
var currentTab   = 'url';

function switchTab(tab, btn) {
  currentTab = tab;
  document.getElementById('tab-url').style.display  = tab === 'url'  ? 'block' : 'none';
  document.getElementById('tab-file').style.display = tab === 'file' ? 'block' : 'none';
  document.querySelectorAll('#source-tabs .toggle-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
}

function handleFile(input) {
  if (input.files && input.files[0]) {
    selectedFile = input.files[0];
    var fn = document.getElementById('fileName');
    fn.textContent = '✓ ' + selectedFile.name;
    fn.style.display = 'block';
  }
}

var dz = document.getElementById('dropzone');
if (dz) {
  dz.addEventListener('dragover',  function(e) { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', function()  { dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', function(e) {
    e.preventDefault(); dz.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files[0]) {
      selectedFile = e.dataTransfer.files[0];
      var fn = document.getElementById('fileName');
      fn.textContent = '✓ ' + selectedFile.name;
      fn.style.display = 'block';
    }
  });
}

function setLoading(msg) {
  document.getElementById('loading').classList.add('show');
  document.getElementById('loadingText').textContent = msg || 'Processing...';
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('results').classList.remove('show');
  document.getElementById('errorBox').classList.remove('show');
}

function showError(msg) {
  document.getElementById('loading').classList.remove('show');
  document.getElementById('analyzeBtn').disabled = false;
  var eb = document.getElementById('errorBox');
  eb.innerHTML = '⚠  ' + esc(msg);
  eb.classList.add('show');
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function analyze() {
  var endpoint = document.getElementById('endpoint').value.trim().replace(/\/+$/, '');
  var apiKey   = document.getElementById('apiKey').value.trim();

  if (!endpoint) { showError('Please enter your Azure Endpoint URL.'); return; }
  if (!apiKey)   { showError('Please enter your Azure API Key.'); return; }

  setLoading('Connecting to Azure...');

  try {
    var body, contentType;

    if (currentTab === 'url') {
      var docUrl = document.getElementById('docUrl').value.trim();
      if (!docUrl) { showError('Please enter a document URL.'); return; }
      body        = JSON.stringify({ urlSource: docUrl });
      contentType = 'application/json';
    } else {
      if (!selectedFile) { showError('Please select a file to upload.'); return; }
      body        = await selectedFile.arrayBuffer();
      contentType = selectedFile.type || 'application/octet-stream';
    }

    var submitUrl = endpoint + '/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30';

    setLoading('Submitting document...');
    var submitRes = await fetch(submitUrl, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': contentType },
      body: body
    });

    if (!submitRes.ok) {
      var errData = {};
      try { errData = await submitRes.json(); } catch(e) {}
      var msg = (errData.error && errData.error.message) ? errData.error.message : ('HTTP ' + submitRes.status + ' — ' + submitRes.statusText);
      throw new Error(msg);
    }

    var operationUrl = submitRes.headers.get('Operation-Location') || submitRes.headers.get('operation-location');
    if (!operationUrl) throw new Error('No Operation-Location returned.');

    var result = null;
    for (var i = 0; i < 60; i++) {
      await sleep(2000);
      setLoading('Analyzing... (' + (i * 2) + 's)');
      var pollRes  = await fetch(operationUrl, { headers: { 'Ocp-Apim-Subscription-Key': apiKey } });
      var pollData = await pollRes.json();
      if (pollData.status === 'succeeded') { result = pollData.analyzeResult; break; }
      if (pollData.status === 'failed') throw new Error(pollData.error ? pollData.error.message : 'Analysis failed.');
    }

    if (!result) throw new Error('Timed out. Please try again.');

    document.getElementById('loading').classList.remove('show');
    document.getElementById('analyzeBtn').disabled = false;
    renderResults(result);

  } catch (e) {
    showError(e.message || String(e));
  }
}

function renderResults(r) {
  var kvEl = document.getElementById('kvContent');
  if (r.keyValuePairs && r.keyValuePairs.length > 0) {
    var rows = r.keyValuePairs.map(function(kv) {
      var key  = kv.key   && kv.key.content   ? kv.key.content   : '—';
      var val  = kv.value && kv.value.content ? kv.value.content : '—';
      var conf = kv.confidence ? Math.round(kv.confidence * 100) + '%' : '?';
      return '<div class="kv-item"><span class="kv-key">'+esc(key)+'</span><span class="kv-value">'+esc(val)+'</span><span class="conf-badge">'+esc(conf)+'</span></div>';
    }).join('');
    kvEl.innerHTML = '<div class="kv-grid">' + rows + '</div>';
  } else {
    kvEl.innerHTML = emptyState('🔑', 'No key-value pairs found.');
  }

  var tableEl = document.getElementById('tableContent');
  if (r.tables && r.tables.length > 0) {
    var html = r.tables.map(function(t, i) {
      var grid = [];
      for (var row = 0; row < t.rowCount; row++) grid.push(new Array(t.columnCount).fill(''));
      (t.cells||[]).forEach(function(c){ grid[c.rowIndex][c.columnIndex] = c.content||''; });
      function isHeader(ri){ return (t.cells||[]).some(function(c){ return c.rowIndex===ri && c.kind==='columnHeader'; }); }
      var rowsHtml = grid.map(function(row,ri){
        return '<tr>'+row.map(function(cell){ return isHeader(ri)?'<th>'+esc(cell)+'</th>':'<td>'+esc(cell)+'</td>'; }).join('')+'</tr>';
      }).join('');
      return '<div style="margin-bottom:20px"><div class="table-label">Table '+(i+1)+' — '+t.rowCount+' × '+t.columnCount+'</div><div class="result-table-wrap"><table class="result-table">'+rowsHtml+'</table></div></div>';
    }).join('');
    tableEl.innerHTML = html;
  } else {
    tableEl.innerHTML = emptyState('📊', 'No tables detected.');
  }

  var paraEl = document.getElementById('paraContent');
  var paras  = r.paragraphs;
  if (paras && paras.length > 0) {
    var shown = paras.slice(0,40).map(function(p){
      return '<div class="para-item">'+(p.role?'<div class="para-role">'+esc(p.role)+'</div>':'')+esc(p.content)+'</div>';
    }).join('');
    var more = paras.length > 40 ? '<div style="text-align:center;font-size:11px;color:var(--muted);padding:12px">+ '+(paras.length-40)+' more</div>' : '';
    paraEl.innerHTML = '<div class="para-list">'+shown+more+'</div>';
  } else if (r.pages) {
    var lines = [];
    r.pages.forEach(function(p){ (p.lines||[]).forEach(function(l){ lines.push(l); }); });
    paraEl.innerHTML = lines.length
      ? '<div class="para-list">'+lines.slice(0,60).map(function(l){ return '<div class="para-item">'+esc(l.content)+'</div>'; }).join('')+'</div>'
      : emptyState('📝','No text extracted.');
  }

  var pageEl = document.getElementById('pageContent');
  if (r.pages && r.pages.length > 0) {
    pageEl.innerHTML = '<div class="pages-grid">'+r.pages.map(function(p){
      var dims = (p.width&&p.height) ? Math.round(p.width)+' × '+Math.round(p.height)+' '+(p.unit||'')+'<br/>' : '';
      return '<div class="page-card"><div class="page-num">'+p.pageNumber+'</div><div class="page-meta">'+dims+(p.lines||[]).length+' lines<br/>'+(p.words||[]).length+' words</div></div>';
    }).join('')+'</div>';
  }

  document.getElementById('results').classList.add('show');
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function emptyState(icon, text) {
  return '<div class="empty-state"><span class="empty-icon">'+icon+'</span><div class="empty-text">'+text+'</div></div>';
}

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}