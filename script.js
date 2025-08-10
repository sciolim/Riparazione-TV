// ====== Storage & Data ======
const LS_KEY = 'electro-inventory:v1';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));

const SAMPLE = [
  { id: uid(), name: 'Resistenza 10kΩ', category: 'Resistenze', quantity: 120, drawer: 'A1', value: '10kΩ', package: '0805', notes: 'Pacco nuovo JLC' },
  { id: uid(), name: 'Condensatore 100nF', category: 'Condensatori', quantity: 85, drawer: 'A2', value: '0.1µF', package: '0603', notes: 'Ceramico X7R' },
  { id: uid(), name: 'ESP32-WROOM-32', category: 'MCU/Module', quantity: 6, drawer: 'B3', package: 'Module', notes: 'DevKit V1' },
  { id: uid(), name: 'LED 5mm Rosso', category: 'LED', quantity: 150, drawer: 'C1', value: '2.0V', package: 'THT', notes: 'Diffusi' },
];

let items = loadItems();

// ====== Elements ======
const tbody = document.getElementById('tbody');
const q = document.getElementById('q');
const onlyLow = document.getElementById('onlyLow');
const totalQty = document.getElementById('totalQty');
const totalItems = document.getElementById('totalItems');

// ====== Utils ======
function loadItems(){
  try{ const raw = localStorage.getItem(LS_KEY); if(!raw) return SAMPLE; const parsed = JSON.parse(raw); return Array.isArray(parsed)?parsed:SAMPLE; }catch{ return SAMPLE }
}
function saveItems(){ localStorage.setItem(LS_KEY, JSON.stringify(items)); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])) }
function ts(){ return new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') }

// ====== Render ======
function render(){
  const term = (q.value||'').trim().toLowerCase();
  let arr = items.slice();
  if (term) arr = arr.filter(it => [it.name,it.category,it.drawer,it.value,it.package,it.notes].some(v => (v||'').toLowerCase().includes(term)));
  if (onlyLow.checked) arr = arr.filter(it => (it.quantity||0) <= 5);
  arr.sort((a,b)=> (a.drawer||'').localeCompare(b.drawer||'') || (a.name||'').localeCompare(b.name||''));

  tbody.innerHTML = '';
  for (const it of arr){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-medium">${escapeHtml(it.name||'')}</td>
      <td>${escapeHtml(it.category||'')}</td>
      <td class="text-right"><span class="qty ${(+it.quantity||0) <= 5 ? 'low':''}">${it.quantity||0}</span></td>
      <td><span class="chip">${escapeHtml(it.drawer||'')}</span></td>
      <td>${escapeHtml(it.value||'')}</td>
      <td>${escapeHtml(it.package||'')}</td>
      <td style="max-width:28rem;white-space:pre-wrap">${escapeHtml(it.notes||'')}</td>
      <td class="actions"><button class="act btn ghost">⋮</button>
        <div class="menu">
          <button data-edit>Modifica</button>
          <button data-del style="color:#b91c1c">Elimina</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
    const actions = tr.querySelector('.actions');
    tr.querySelector('.act').addEventListener('click',()=>{ actions.classList.toggle('open') })
    document.addEventListener('click', (e)=>{ if(!actions.contains(e.target)) actions.classList.remove('open') })
    tr.querySelector('[data-edit]').addEventListener('click',()=> openDialog(it))
    tr.querySelector('[data-del]').addEventListener('click',()=> delItem(it.id))
  }
  totalQty.textContent = String(arr.reduce((s,i)=>s+(+i.quantity||0),0));
  totalItems.textContent = String(items.length);
}

// ====== CSV helpers ======
function exportCSV(){
  const headers = ['id','name','category','quantity','drawer','value','package','notes'];
  const lines = [headers.join(',')].concat(items.map(it => headers.map(h=>{
    const val = String(it[h] ?? '').replaceAll('"','""');
    return (val.includes(',')||val.includes('\n')||val.includes('"')) ? `"${val}"` : val;
  }).join(',')));
  download(lines.join('\n'), `archivio-componenti-${ts()}.csv`, 'text/csv;charset=utf-8;');
}
function exportJSON(){ download(JSON.stringify(items,null,2), 'archivio-componenti.json', 'application/json'); }
function download(text, name, type){ const blob = new Blob([text],{type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
function parseCSV(text){
  const rows=[]; let i=0, cur='', inQ=false, row=[]; while(i<=text.length){
    const ch = text[i] ?? '\n';
    if (inQ){ if (ch==='"' && text[i+1]==='"'){ cur+='"'; i++; } else if (ch==='"'){ inQ=false; } else { cur+=ch } }
    else { if (ch==='"') inQ=true; else if (ch===','){ row.push(cur); cur=''; } else if (ch==='\n' || i===text.length){ row.push(cur); rows.push(row); row=[]; cur=''; } else { cur+=ch } }
    i++;
  } return rows;
}

// ====== CRUD ======
function delItem(id){ items = items.filter(x => x.id !== id); saveItems(); render(); }
function upsertItem(data){
  const idx = items.findIndex(x => x.id === data.id);
  if (idx === -1) items.push(data); else items[idx] = data;
  saveItems(); render();
}

// ====== Dialog ======
const dlg = document.getElementById('dlg');
const dlgTitle = document.getElementById('dlgTitle');
const frm = document.getElementById('frm');
const f = id => document.getElementById(id);

function openDialog(initial){
  dlgTitle.textContent = initial ? 'Modifica componente' : 'Nuovo componente';
  f('f_id').value = initial?.id || uid();
  f('f_name').value = initial?.name || '';
  f('f_category').value = initial?.category || '';
  f('f_quantity').value = initial?.quantity ?? 0;
  f('f_drawer').value = initial?.drawer || '';
  f('f_value').value = initial?.value || '';
  f('f_package').value = initial?.package || '';
  f('f_notes').value = initial?.notes || '';
  dlg.showModal();
}
document.getElementById('dlgClose').addEventListener('click', ()=> dlg.close());
document.getElementById('dlgSave').addEventListener('click', (e)=>{
  e.preventDefault();
  if (!f('f_name').value.trim()) { alert('Inserisci un nome'); return; }
  const data = {
    id: f('f_id').value,
    name: f('f_name').value,
    category: f('f_category').value,
    quantity: Number(f('f_quantity').value||0),
    drawer: f('f_drawer').value,
    value: f('f_value').value,
    package: f('f_package').value,
    notes: f('f_notes').value,
  };
  upsertItem(data); dlg.close();
});

// ====== Topbar actions ======
document.getElementById('btnNew').addEventListener('click', ()=> openDialog(null));
document.getElementById('btnImport').addEventListener('click', ()=> document.getElementById('fileImport').click());
document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
document.getElementById('btnPrint').addEventListener('click', ()=> window.print());

// Reset & Clear
document.getElementById('btnReset').addEventListener('click', ()=> { q.value=''; onlyLow.checked=false; render(); });
document.getElementById('btnClear').addEventListener('click', ()=> { if (confirm("Svuotare completamente l'archivio?")) { items=[]; saveItems(); render(); } });

// ====== Import ======
const fileImport = document.getElementById('fileImport');
fileImport.addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    if (file.name.endsWith('.json')){
      try{ const data = JSON.parse(text); if(Array.isArray(data)) { items = data; saveItems(); render(); } }catch{}
    } else {
      const rows = parseCSV(text);
      if (!rows.length) return;
      const headers = rows[0].map(h=>h.trim());
      const idx = h => headers.indexOf(h);
      const list = rows.slice(1).filter(r => r.length>=2 && r.some(x=>x && String(x).trim())).map(r=>({
        id: r[idx('id')] || uid(),
        name: r[idx('name')] || '',
        category: r[idx('category')] || '',
        quantity: Number(r[idx('quantity')] || 0),
        drawer: r[idx('drawer')] || '',
        value: r[idx('value')] || '',
        package: r[idx('package')] || '',
        notes: r[idx('notes')] || '',
      }));
      items = list; saveItems(); render();
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ====== Filters ======
q.addEventListener('input', render);
onlyLow.addEventListener('change', render);

// ====== First render ======
render();
