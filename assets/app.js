const monthNames=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const monthShort=monthNames.map(x=>x.slice(0,3));
let db={...SEED};
let supabaseClient=null;
let sessionLoaded=false;
const S=window.__INDEMETAL_SUPA__||null;

function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function fmtDate(s){if(!s)return "—";let [y,m,d]=String(s).slice(0,10).split("-");return `${d}/${m}/${y}`}
function monthOf(s){return Number(String(s).slice(5,7))-1}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function bindingAvailable(){
  try{
    const r=await fetch(S.supabase.supabaseUrl+"/auth/v1/health",{headers:{apikey:S.supabase.supabaseKey},signal:AbortSignal.timeout(4000)});
    return r.ok;
  }catch(e){return false}
}

function setBadge(live){
  const b=document.getElementById("connectionBadge");
  b.textContent=live?"Supabase conectado":"Modo demonstração";
  b.className="badge "+(live?"live":"demo");
  document.getElementById("logoutBtn").style.display=live?"":"none";
}

async function connectAndLoad(){
  supabaseClient=S.supabase;
  try{
    const [o,d,b,x,op,mot,tam]=await Promise.all([
      supabaseClient.from("telas_rasgadas").select("*").order("data",{ascending:false}),
      supabaseClient.from("desplaques").select("*").order("data",{ascending:false}),
      supabaseClient.from("banhos_removedor").select("*").order("data_inicio",{ascending:false}),
      supabaseClient.from("quadros_descartados").select("*").order("data",{ascending:false}),
      supabaseClient.from("operadores").select("*").order("nome"),
      supabaseClient.from("motivos").select("*").order("nome"),
      supabaseClient.from("tamanhos_tela").select("*").order("nome")
    ]);
    let erros=[];
    if(!o.error && o.data) db.ocorrencias=o.data; else if(o.error) erros.push("telas_rasgadas: "+o.error.message);
    if(!d.error && d.data) db.desplaques=d.data; else if(d.error) erros.push("desplaques: "+d.error.message);
    if(!b.error && b.data) db.banhos=b.data; else if(b.error) erros.push("banhos_removedor: "+b.error.message);
    if(!x.error && x.data) db.descartes=x.data; else if(x.error) erros.push("quadros_descartados: "+x.error.message);
    if(!op.error && op.data?.length) db.operadores=op.data.map(r=>r.nome); else if(op.error) erros.push("operadores: "+op.error.message);
    if(!mot.error && mot.data?.length) db.motivos=mot.data.map(r=>r.nome); else if(mot.error) erros.push("motivos: "+mot.error.message);
    if(!tam.error && tam.data?.length) db.tamanhos=tam.data.map(r=>r.nome); else if(tam.error) erros.push("tamanhos_tela: "+tam.error.message);
    if(erros.length){console.error("Falhas ao carregar do Supabase:",erros);alert("Algumas tabelas não carregaram do Supabase:\n\n"+erros.join("\n"))}
    setBadge(true);
  }catch(e){console.warn(e);setBadge(false)}
  document.getElementById("loginGate").classList.remove("open");
  renderAll();
}

function showGate(){document.getElementById("loginGate").classList.add("open")}

async function requireLogin(){
  try{
    const {data:{session}}=await S.supabase.auth.getSession();
    if(session){await connectAndLoad();return}
    showGate();
    S.supabase.auth.onAuthStateChange(async(e,s)=>{
      if(s&&!sessionLoaded){sessionLoaded=true;await connectAndLoad()}
      if(e==="SIGNED_OUT")location.reload();
    });
  }catch(e){console.warn(e);setBadge(false);renderAll()}
}

async function boot(){
  if(!S){setBadge(false);renderAll();return}
  if(!await bindingAvailable()){setBadge(false);renderAll();return}
  await requireLogin();
}

async function logout(){
  if(!supabaseClient)return;
  await supabaseClient.auth.signOut();
  location.reload();
}

async function insert(table,payload){
  if(!supabaseClient) return true;
  const {error}=await supabaseClient.from(table).insert(payload);
  if(error){alert("Não foi possível salvar no Supabase: "+error.message);return false}
  return true;
}

function setupNav(){
 document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
 document.getElementById("reloadBtn").onclick=()=>renderAll();
 document.getElementById("logoutBtn").onclick=logout;
 document.getElementById("gateLoginBtn").onclick=()=>S&&S.auth.openSignInModal();
 document.getElementById("searchOc").oninput=renderOcorrencias;
 document.getElementById("filterOcMonth").onchange=renderOcorrencias;
 document.getElementById("searchDesc").oninput=renderDescartes;
 document.getElementById("filterDescYear").onchange=renderDescartes;
 document.getElementById("dashYear").onchange=renderDashboard;
 document.getElementById("dashMonth").onchange=renderDashboard;
 document.getElementById("despYear").onchange=renderDesplaques;
}
function showPage(p){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 document.getElementById("page-"+p).classList.add("active");
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 const titles={dashboard:"Dashboard",ocorrencias:"Telas rasgadas",desplaques:"Desplaque",banhos:"Banho removedor",descartes:"Quadros descartados",cadastros:"Cadastros"};
 document.getElementById("pageTitle").textContent=titles[p];
 renderAll();
}
function fillFilters(){
 let years=[...new Set([...db.ocorrencias,...db.descartes].map(x=>String(x.data).slice(0,4)).filter(Boolean))].sort();
 if(!years.includes("2026"))years.push("2026");
 let curY=dashYear.value||years[years.length-1], curM=dashMonth.value||"all";
 let curOcM=filterOcMonth.value||"all", curDY=filterDescYear.value||String(years[years.length-1]);
 let curDespY=despYear.value||years[years.length-1];
 despYear.innerHTML=years.map(y=>`<option>${y}</option>`).join("");
 despYear.value=curDespY;
 dashYear.innerHTML=years.map(y=>`<option>${y}</option>`).join("");
 dashYear.value=curY;
 dashMonth.innerHTML='<option value="all">Todos</option>'+monthNames.map((m,i)=>`<option value="${i}">${m}</option>`).join("");
 dashMonth.value=curM;
 filterOcMonth.innerHTML='<option value="all">Todos os meses</option>'+monthNames.map((m,i)=>`<option value="${i}">${m}</option>`).join("");
 filterOcMonth.value=curOcM;
 filterDescYear.innerHTML='<option value="all">Todos os anos</option>'+years.map(y=>`<option>${y}</option>`).join("");
 filterDescYear.value=curDY;
}
function renderAll(){fillFilters();renderDashboard();renderOcorrencias();renderDesplaques();renderBanhos();renderDescartes();renderCadastros()}
function filteredOcc(){
 let y=dashYear.value||"2026", m=dashMonth.value||"all";
 return db.ocorrencias.filter(x=>String(x.data).startsWith(y+"-")&&(m==="all"||monthOf(x.data)==Number(m)));
}
function filteredDesp(y,m){
 return db.desplaques.filter(x=>x.data&&String(x.data).startsWith(y+"-")&&(m==="all"||monthOf(x.data)==Number(m)));
}
function card(label,value,hint="",icon=""){return `<div class="card"><div class="card-top">${icon?`<span class="card-ico">${icon}</span>`:""}<span class="label">${label}</span></div><div class="value">${value}</div><div class="hint">${hint}</div></div>`}
function renderDashboard(){
 let data=filteredOcc();
 let y=dashYear.value||"2026", m=dashMonth.value||"all";
 let des=filteredDesp(y,m);
 let et=des.filter(x=>norm(x.unidade)==="etiquetas").reduce((a,x)=>a+Number(x.quantidade||0),0);
 let gr=des.filter(x=>norm(x.unidade)==="graficos").reduce((a,x)=>a+Number(x.quantidade||0),0);
 let st=bathStats();
 document.getElementById("kpis").innerHTML=
  card("Telas rasgadas",data.length,"período selecionado","⚠")+
  card("Desplaque",(et+gr).toLocaleString("pt-BR"),m==="all"?("total de "+y):"período selecionado","◎")+
  card("Banho removedor",st.avg!=null?st.avg.toLocaleString("pt-BR")+" méd.":"—",st.last?`último ciclo: ${st.last.total_telas??"—"} telas${st.lastDur!=null?" em "+st.lastDur+" dias":""}`:"sem registros","◷")+
  card("Quadros descartados",db.descartes.filter(x=>String(x.data).startsWith(y)).length,"no ano selecionado","▣");
 renderBars("reasonBars",groupCount(data,"motivo"),"motivo");
 renderBars("operatorBars",groupCount(data,"operador"),"operador");
 drawLine("monthlyChart",[{color:"#e1261c",vals:Array.from({length:12},(_,i)=>data.filter(x=>monthOf(x.data)===i).length)}],monthShort,true);
 drawLine("desplaqueChart",[
  {color:"#e1261c",vals:monthNames.map((_,i)=>des.filter(x=>monthOf(x.data)===i&&norm(x.unidade)==="etiquetas").reduce((a,x)=>a+Number(x.quantidade||0),0))},
  {color:"#17212b",vals:monthNames.map((_,i)=>des.filter(x=>monthOf(x.data)===i&&norm(x.unidade)==="graficos").reduce((a,x)=>a+Number(x.quantidade||0),0))}
 ],monthShort,false);
}
function groupCount(arr,key){let c={};arr.forEach(x=>{let k=x[key]||"Não informado";c[k]=(c[k]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,12)}
function renderBars(id,items,label){
 let max=items[0]?.[1]||1;
 document.getElementById(id).innerHTML=items.length?items.map(([n,v])=>`<div class="bar-row"><span title="${esc(n)}">${esc(n)}</span><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><span>${v}</span></div>`).join(""):'<div class="empty">Sem dados.</div>';
}
function drawLine(id,series,labels,area=true){
 const c=document.getElementById(id),ctx=c.getContext("2d"),w=c.clientWidth||500,h=c.clientHeight||250,dpr=devicePixelRatio||1;
 c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
 const pad={l:36,r:16,t:24,b:26};
 const rawMax=Math.max(1,...series.flatMap(s=>s.vals));
 const nice=rawMax<=4?4:Math.ceil(rawMax/4)*4;
 const X=i=>pad.l+(w-pad.l-pad.r)*(i/(labels.length-1||1));
 const Y=v=>pad.t+(h-pad.t-pad.b)*(1-v/nice);
 ctx.font="10px Saira,Segoe UI";
 ctx.setLineDash([3,4]);ctx.strokeStyle="#dde3e8";ctx.lineWidth=1;ctx.fillStyle="#98a2ab";
 for(let i=0;i<=3;i++){const y=pad.t+(h-pad.t-pad.b)*i/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(String(Math.round(nice*(1-i/3))),6,y+3)}
 ctx.setLineDash([]);
 ctx.fillStyle="#98a2ab";labels.forEach((l,i)=>ctx.fillText(l,X(i)-7,h-8));
 const curve=pts=>{ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],cx=(a.x+b.x)/2;ctx.bezierCurveTo(cx,a.y,cx,b.y,b.x,b.y)}};
 series.forEach((s,si)=>{
  const pts=s.vals.map((v,i)=>({x:X(i),y:Y(v)}));
  if(area){const g=ctx.createLinearGradient(0,pad.t,0,h-pad.b);g.addColorStop(0,s.color+"2e");g.addColorStop(1,s.color+"00");curve(pts);ctx.lineTo(pts[pts.length-1].x,h-pad.b);ctx.lineTo(pts[0].x,h-pad.b);ctx.closePath();ctx.fillStyle=g;ctx.fill()}
  curve(pts);ctx.strokeStyle=s.color;ctx.lineWidth=2.5;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();
  pts.forEach((p,i)=>{
   const v=s.vals[i];
   ctx.beginPath();ctx.arc(p.x,p.y,3.6,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=s.color;ctx.stroke();
   if(!v)return;
   let lx=p.x,ly=p.y-9;
   if(si===1&&series[0].vals[i]===v)lx=p.x+15;
   ctx.font="700 10px Saira,Segoe UI";ctx.textAlign="center";ctx.fillStyle=s.color;
   ctx.fillText(String(v),lx,ly);ctx.textAlign="left";
  });
 });
}
function renderOcorrencias(){
 let q=norm(document.getElementById("searchOc").value),m=document.getElementById("filterOcMonth").value;
 let arr=db.ocorrencias.filter(x=>(m==="all"||monthOf(x.data)==Number(m))&&(!q||norm(x.operador+" "+x.motivo+" "+x.tamanho).includes(q))).sort((a,b)=>b.data.localeCompare(a.data));
 document.getElementById("ocTable").innerHTML=arr.map(x=>`<tr><td>${fmtDate(x.data)}</td><td><strong>${esc(x.operador)}</strong></td><td>${esc(x.motivo)}</td><td>${esc(x.tamanho)}</td><td>${esc(x.observacao)}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">Nenhum registro encontrado.</td></tr>';
}
function despYearOf(x){return x.data?String(x.data).slice(0,4):"2026"}
function despMonthIdx(x){return x.data?monthOf(x.data):monthNames.findIndex(m=>norm(m)===norm(x.mes))}
function renderDesplaques(){
 let y=despYear.value||"2026";
 let rows=db.desplaques.filter(x=>despYearOf(x)===y);
 let sum=(arr,un)=>arr.filter(x=>norm(x.unidade)===un).reduce((a,x)=>a+Number(x.quantidade||0),0);
 let te=0,tg=0;
 let body=monthNames.map((m,i)=>{let rs=rows.filter(x=>despMonthIdx(x)===i);let e=sum(rs,"etiquetas"),g=sum(rs,"graficos");te+=e;tg+=g;let t=e+g;return t?`<tr><td>${m}</td><td>${e.toLocaleString("pt-BR")}</td><td>${g.toLocaleString("pt-BR")}</td><td><strong>${t.toLocaleString("pt-BR")}</strong></td></tr>`:""}).join("");
 document.getElementById("despPivot").innerHTML=te+tg?`<table class="pivot"><thead><tr><th>Mês</th><th>Etiquetas</th><th>Gráficos</th><th>Total</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td>Total ${y}</td><td>${te.toLocaleString("pt-BR")}</td><td>${tg.toLocaleString("pt-BR")}</td><td>${(te+tg).toLocaleString("pt-BR")}</td></tr></tfoot></table>`:'<div class="empty">Sem lançamentos neste ano.</div>';
 document.getElementById("despKpis").innerHTML=card("Etiquetas",te.toLocaleString("pt-BR"),"telas desplacadas em "+y,"◎")+card("Gráficos",tg.toLocaleString("pt-BR"),"telas desplacadas em "+y,"▨")+card("Total",(te+tg).toLocaleString("pt-BR"),"todas as unidades","Σ");
 let arr=rows.sort((a,b)=>String(b.data||"").localeCompare(String(a.data||"")));
 document.getElementById("despTable").innerHTML=arr.map(x=>`<tr><td>${fmtDate(x.data||x.mes)}</td><td>${esc(x.unidade)}</td><td><strong>${Number(x.quantidade||0).toLocaleString("pt-BR")}</strong></td></tr>`).join("");
}
function bathDuration(x){
 if(!x.data_fim||!x.data_inicio)return null;
 return Math.max(0,Math.round((new Date(x.data_fim)-new Date(x.data_inicio))/86400000));
}
function bathStats(){
 let valid=db.banhos.filter(x=>x.data_inicio&&x.total_telas!=null);
 let avg=valid.length?Math.round(valid.reduce((a,x)=>a+Number(x.total_telas||0),0)/valid.length):null;
 let complete=db.banhos.filter(x=>x.data_fim&&x.total_telas!=null);
 let last=[...complete].sort((a,b)=>String(b.data_fim||"").localeCompare(String(a.data_fim||"")))[0]
  ||[...db.banhos].sort((a,b)=>String(b.data_inicio||"").localeCompare(String(a.data_inicio||"")))[0];
 return {avg,last,lastDur:last?bathDuration(last):null};
}
function renderBanhos(){
 let arr=[...db.banhos].sort((a,b)=>String(b.data_inicio||"").localeCompare(String(a.data_inicio||"")));
 let st=bathStats();
 document.getElementById("currentBath").innerHTML=st.last?
  `<div class="eyebrow">RESUMO</div><h2>Média de ${st.avg!=null?st.avg.toLocaleString("pt-BR"):"—"} telas por ciclo</h2><p>Último ciclo: ${fmtDate(st.last.data_inicio)} a ${fmtDate(st.last.data_fim)} (${st.lastDur!=null?st.lastDur+" dias":"—"}) — <strong>${st.last.total_telas??"—"} telas</strong>.</p>`
  :`<div class="eyebrow">BANHO</div><h2>Nenhum ciclo registrado</h2><p>Registre uma troca para começar.</p>`;
 document.getElementById("bathTable").innerHTML=arr.map(x=>{let dur=bathDuration(x);return `<tr><td>${fmtDate(x.data_inicio)}</td><td>${fmtDate(x.data_fim)}</td><td>${dur!=null?dur+" dias":"—"}</td><td>${x.total_telas??"—"}</td></tr>`}).join("");
}
function renderDescartes(){
 let q=norm(document.getElementById("searchDesc").value), y=document.getElementById("filterDescYear").value;
 let arr=db.descartes.filter(x=>(y==="all"||String(x.data).startsWith(y))&&(!q||norm(x.tamanho+" "+x.motivo).includes(q))).sort((a,b)=>b.data.localeCompare(a.data));
 let total=arr.length, last=arr.filter(x=>String(x.data).startsWith("2026")).length;
 document.getElementById("descKpis").innerHTML=card("Registros",total,"filtro atual","▣")+card("2026",last,"histórico do ano","◷")+card("Tamanhos",new Set(arr.map(x=>x.tamanho)).size,"dimensões diferentes","⌀");
 document.getElementById("descTable").innerHTML=arr.map(x=>`<tr><td>${fmtDate(x.data)}</td><td>${esc(x.tamanho)}</td><td>${esc(x.motivo)}</td><td>${esc(x.observacao)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">Nenhum registro encontrado.</td></tr>';
}
function renderCadastros(){
 const make=(arr,id)=>document.getElementById(id).innerHTML=arr.map(x=>`<div class="list-item"><span>${esc(x)}</span><span class="mini">ativo</span></div>`).join("");
 make(db.operadores,"operatorsList");make(db.motivos,"reasonsList");make(db.tamanhos,"sizesList");
}
function openModal(type){
 const titles={ocorrencia:"Nova tela rasgada",desplaque:"Novo desplaque",banho:"Registrar troca de banho",descarte:"Novo quadro descartado"};
 modalTitle.textContent=titles[type];
 let html="";
 if(type==="ocorrencia")html=`<div class="form-grid"><label class="field">Data<input type="date" name="data" value="${new Date().toISOString().slice(0,10)}" required></label><label class="field">Operador<select name="operador">${db.operadores.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label><label class="field">Motivo<select name="motivo">${db.motivos.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label><label class="field">Tamanho<select name="tamanho">${db.tamanhos.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label><label class="field full">Observação<textarea name="observacao" rows="3"></textarea></label></div>`;
 if(type==="desplaque")html=`<div class="form-grid"><label class="field">Data<input type="date" name="data" value="${new Date().toISOString().slice(0,10)}" required></label><label class="field">Unidade<select name="unidade"><option>Etiquetas</option><option>Gráficos</option></select></label><label class="field full">Quantidade<input type="number" name="quantidade" min="1" required></label></div>`;
 if(type==="banho")html=`<div class="form-grid"><label class="field">Início<input type="date" name="data_inicio" required></label><label class="field">Fim<input type="date" name="data_fim" required></label><label class="field full">Quantidade de telas do ciclo<input type="number" name="total_telas" min="1" required></label></div>`;
 if(type==="descarte")html=`<div class="form-grid"><label class="field">Data<input type="date" name="data" value="${new Date().toISOString().slice(0,10)}" required></label><label class="field">Tamanho<select name="tamanho">${db.tamanhos.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label><label class="field full">Motivo<input name="motivo" value=""></label><label class="field full">Observação<textarea name="observacao" rows="3"></textarea></label></div>`;
 modalForm.innerHTML=html+`<div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar</button></div>`;
 modal.classList.add("open");
 modalForm.onsubmit=async e=>{e.preventDefault();let f=new FormData(modalForm),o=Object.fromEntries(f.entries());if(type==="ocorrencia"){db.ocorrencias.unshift(o);if(!await insert("telas_rasgadas",o))return}if(type==="desplaque"){o.quantidade=Number(o.quantidade);db.desplaques.push(o);if(!await insert("desplaques",o))return}if(type==="banho"){if(!o.data_inicio||!o.data_fim||!o.total_telas){alert("Preencha início, fim e quantidade de telas do ciclo.");return}o.total_telas=Number(o.total_telas);db.banhos.push(o);if(!await insert("banhos_removedor",o))return}if(type==="descarte"){db.descartes.unshift(o);if(!await insert("quadros_descartados",o))return}closeModal();renderAll()}
}
function closeModal(){modal.classList.remove("open")}
function openCatalog(type){
 let label={operadores:"Nome do operador",motivos:"Motivo",tamanhos:"Tamanho"}[type],value=prompt("Digite "+label+":");
 if(!value?.trim())return;value=value.trim();if(db[type].includes(value))return;
 db[type].push(value);db[type].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 const table={operadores:"operadores",motivos:"motivos",tamanhos:"tamanhos_tela"}[type];
 insert(table,{nome:value});renderCadastros();
}
setupNav();boot();
