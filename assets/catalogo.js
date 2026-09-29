/* catalogo.js  (versão 2)
   1) Botões Operadores / Motivos / Tamanhos ao lado de "+ Nova ocorrência" (abrem janela para adicionar e excluir)
   2) Botões de EDITAR (✎) e EXCLUIR (×) em todas as tabelas de registros:
      Telas rasgadas, Desplaque, Banho removedor e Quadros descartados
   Carregar DEPOIS do app.js. */
(function () {
  const $ = id => document.getElementById(id);
  const TITULOS = { operadores: "Operadores", motivos: "Motivos", tamanhos: "Tamanhos" };
  const SINGULAR = { operadores: "operador", motivos: "motivo", tamanhos: "tamanho" };
  const TABELAS = { operadores: "operadores", motivos: "motivos", tamanhos: "tamanhos_tela" };
  const TAB = { ocorrencias: "telas_rasgadas", desplaques: "desplaques", banhos: "banhos_removedor", descartes: "quadros_descartados" };
  let catAtual = null;
  const regs = {};

  // ---------- Estilo ----------
  const st = document.createElement("style");
  st.textContent = `
    .list-item{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .del-btn{flex:none;width:26px;height:26px;border:0;border-radius:6px;background:#fdecea;color:#e1261c;font-size:17px;font-weight:700;line-height:1;cursor:pointer}
    .del-btn:hover{background:#e1261c;color:#fff}
    .list.scroll{max-height:300px;overflow-y:auto}
    .cat-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
    td.acoes{white-space:nowrap;text-align:right;width:1%}
    .reg-btn{width:28px;height:28px;border:0;border-radius:6px;cursor:pointer;line-height:1;margin-left:6px;font-size:15px}
    .reg-edit{background:#eef1f4;color:#17212b}
    .reg-edit:hover{background:#17212b;color:#fff}
    .reg-del{background:#fdecea;color:#e1261c;font-size:17px;font-weight:700}
    .reg-del:hover{background:#e1261c;color:#fff}
  `;
  document.head.appendChild(st);

  // ---------- insert: passa a guardar o "id" do registro salvo (necessário para editar/excluir) ----------
  window.insert = async function (table, payload) {
    if (!supabaseClient) return true;
    const { data, error } = await supabaseClient.from(table).insert(payload).select();
    if (error) { alert("Não foi possível salvar no Supabase: " + error.message); return false; }
    if (data && data[0] && payload && !Array.isArray(payload)) Object.assign(payload, data[0]);
    return true;
  };

  // =====================================================================
  // PARTE 1 — CADASTROS (operadores, motivos, tamanhos)
  // =====================================================================
  const tools = document.querySelector("#page-ocorrencias .page-tools");
  const novaBtn = tools && tools.querySelector("button.primary");
  if (novaBtn) {
    const wrap = document.createElement("div");
    wrap.className = "cat-actions";
    novaBtn.parentNode.insertBefore(wrap, novaBtn);
    Object.keys(TITULOS).forEach(tipo => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "primary";
      b.textContent = TITULOS[tipo];
      b.onclick = () => abrirCadastro(tipo);
      wrap.appendChild(b);
    });
    wrap.appendChild(novaBtn);
  }

  function abrirCadastro(tipo) {
    catAtual = tipo;
    $("modalTitle").textContent = TITULOS[tipo];
    const form = $("modalForm");
    form.innerHTML = `
      <div class="form-grid"><label class="field full">Adicionar ${SINGULAR[tipo]}<input id="catNovo" placeholder="Digite o nome e tecle Enter" autocomplete="off"></label></div>
      <div class="list scroll" id="catLista" style="margin-top:14px"></div>
      <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Fechar</button><button class="primary">Adicionar</button></div>`;
    form.onsubmit = e => { e.preventDefault(); adicionar(); };
    preencherLista();
    $("modal").classList.add("open");
    setTimeout(() => { const i = $("catNovo"); if (i) i.focus(); }, 50);
  }

  function itensHtml(tipo) {
    const nomes = [...new Set(db[tipo])];
    return nomes.length
      ? nomes.map(x => `<div class="list-item"><span>${esc(x)}</span><button type="button" class="del-btn" data-type="${tipo}" data-name="${esc(x)}" title="Excluir">×</button></div>`).join("")
      : '<div class="empty">Nenhum item.</div>';
  }

  function preencherLista() {
    const el = $("catLista");
    if (el && catAtual) el.innerHTML = itensHtml(catAtual);
  }

  async function adicionar() {
    const campo = $("catNovo");
    const valor = (campo.value || "").trim();
    if (!valor) return;
    if (db[catAtual].includes(valor)) { alert("Esse nome já está na lista."); return; }
    if (!await insert(TABELAS[catAtual], { nome: valor })) return;
    db[catAtual].push(valor);
    db[catAtual].sort((a, b) => a.localeCompare(b, "pt-BR"));
    campo.value = "";
    renderCadastros();
    campo.focus();
  }

  window.renderCadastros = function () {
    const make = (tipo, id) => { const el = $(id); if (el) el.innerHTML = itensHtml(tipo); };
    make("operadores", "operatorsList");
    make("motivos", "reasonsList");
    make("tamanhos", "sizesList");
    preencherLista();
  };

  async function excluirNome(tipo, nome) {
    if (!confirm(`Excluir "${nome}" da lista?\n\nOs registros antigos que já usam esse nome continuam no histórico.`)) return;
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from(TABELAS[tipo]).delete().eq("nome", nome).select();
      if (error) { alert("Não foi possível excluir: " + error.message); return; }
      if (!data || !data.length) { alert("Nada foi excluído. Provavelmente falta a permissão de exclusão no Supabase."); return; }
    }
    db[tipo] = db[tipo].filter(x => x !== nome);
    renderCadastros();
  }

  // =====================================================================
  // PARTE 2 — EDITAR / EXCLUIR REGISTROS DAS TABELAS
  // =====================================================================
  function desenhar(tbodyId, tab, arr, celulas, colunas) {
    const tb = $(tbodyId);
    const tr = tb.closest("table").querySelector("thead tr");
    if (tr && !tr.dataset.acoes) {
      const th = document.createElement("th");
      th.textContent = "Ações";
      tr.appendChild(th);
      tr.dataset.acoes = "1";
    }
    regs[tab] = arr;
    tb.innerHTML = arr.length
      ? arr.map((x, i) => `<tr>${celulas(x)}<td class="acoes"><button type="button" class="reg-btn reg-edit" data-act="edit" data-tab="${tab}" data-i="${i}" title="Editar">✎</button><button type="button" class="reg-btn reg-del" data-act="del" data-tab="${tab}" data-i="${i}" title="Excluir">×</button></td></tr>`).join("")
      : `<tr><td colspan="${colunas + 1}" class="empty">Nenhum registro encontrado.</td></tr>`;
  }

  // --- Telas rasgadas
  window.renderOcorrencias = function () {
    const q = norm($("searchOc").value), m = $("filterOcMonth").value;
    const arr = db.ocorrencias
      .filter(x => (m === "all" || monthOf(x.data) == Number(m)) && (!q || norm(x.operador + " " + x.motivo + " " + x.tamanho).includes(q)))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)));
    desenhar("ocTable", "ocorrencias", arr,
      x => `<td>${fmtDate(x.data)}</td><td><strong>${esc(x.operador)}</strong></td><td>${esc(x.motivo)}</td><td>${esc(x.tamanho)}</td><td>${esc(x.observacao)}</td>`, 5);
  };

  // --- Desplaque
  const origDesplaques = window.renderDesplaques;
  window.renderDesplaques = function () {
    origDesplaques();
    const y = $("despYear").value || "2026";
    const arr = db.desplaques.filter(x => despYearOf(x) === y)
      .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
    desenhar("despTable", "desplaques", arr,
      x => `<td>${fmtDate(x.data || x.mes)}</td><td>${esc(x.unidade)}</td><td><strong>${Number(x.quantidade || 0).toLocaleString("pt-BR")}</strong></td>`, 3);
  };

  // --- Banho removedor
  const origBanhos = window.renderBanhos;
  window.renderBanhos = function () {
    origBanhos();
    const arr = [...db.banhos].sort((a, b) => String(b.data_inicio || "").localeCompare(String(a.data_inicio || "")));
    desenhar("bathTable", "banhos", arr, x => {
      const dur = bathDuration(x);
      return `<td>${fmtDate(x.data_inicio)}</td><td>${fmtDate(x.data_fim)}</td><td>${dur != null ? dur + " dias" : "—"}</td><td>${x.total_telas ?? "—"}</td>`;
    }, 4);
  };

  // --- Quadros descartados
  const origDescartes = window.renderDescartes;
  window.renderDescartes = function () {
    origDescartes();
    const q = norm($("searchDesc").value), y = $("filterDescYear").value;
    const arr = db.descartes
      .filter(x => (y === "all" || String(x.data).startsWith(y)) && (!q || norm(x.tamanho + " " + x.motivo).includes(q)))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)));
    desenhar("descTable", "descartes", arr,
      x => `<td>${fmtDate(x.data)}</td><td>${esc(x.tamanho)}</td><td>${esc(x.motivo)}</td><td>${esc(x.observacao)}</td>`, 4);
  };

  // Os campos de busca/filtro guardaram a função antiga; ligar de novo nas novas
  $("searchOc").oninput = renderOcorrencias;
  $("filterOcMonth").onchange = renderOcorrencias;
  $("searchDesc").oninput = renderDescartes;
  $("filterDescYear").onchange = renderDescartes;
  $("despYear").onchange = renderDesplaques;

  // --- Formulários de edição
  const dt = v => (v ? String(v).slice(0, 10) : "");
  const sel = (name, lista, atual) => {
    const l = [...new Set(lista)];
    if (atual && !l.includes(atual)) l.unshift(atual);
    return `<select name="${name}">${l.map(x => `<option${x === atual ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  };

  const CFG = {
    ocorrencias: {
      titulo: "Editar tela rasgada",
      resumo: r => `${fmtDate(r.data)} — ${r.operador} — ${r.motivo}`,
      form: r => `<div class="form-grid">
        <label class="field">Data<input type="date" name="data" value="${dt(r.data)}" required></label>
        <label class="field">Operador${sel("operador", db.operadores, r.operador)}</label>
        <label class="field">Motivo${sel("motivo", db.motivos, r.motivo)}</label>
        <label class="field">Tamanho${sel("tamanho", db.tamanhos, r.tamanho)}</label>
        <label class="field full">Observação<textarea name="observacao" rows="3">${esc(r.observacao)}</textarea></label></div>`,
      valores: f => ({ data: f.get("data"), operador: f.get("operador"), motivo: f.get("motivo"), tamanho: f.get("tamanho"), observacao: f.get("observacao") })
    },
    desplaques: {
      titulo: "Editar desplaque",
      resumo: r => `${fmtDate(r.data || r.mes)} — ${r.unidade} — ${r.quantidade}`,
      form: r => `<div class="form-grid">
        <label class="field">Data<input type="date" name="data" value="${dt(r.data)}" required></label>
        <label class="field">Unidade${sel("unidade", ["Etiquetas", "Gráficos"], r.unidade)}</label>
        <label class="field full">Quantidade<input type="number" name="quantidade" min="1" value="${esc(r.quantidade)}" required></label></div>`,
      valores: f => ({ data: f.get("data"), unidade: f.get("unidade"), quantidade: Number(f.get("quantidade")) })
    },
    banhos: {
      titulo: "Editar troca de banho",
      resumo: r => `${fmtDate(r.data_inicio)} a ${fmtDate(r.data_fim)} — ${r.total_telas} telas`,
      form: r => `<div class="form-grid">
        <label class="field">Início<input type="date" name="data_inicio" value="${dt(r.data_inicio)}" required></label>
        <label class="field">Fim<input type="date" name="data_fim" value="${dt(r.data_fim)}" required></label>
        <label class="field full">Quantidade de telas do ciclo<input type="number" name="total_telas" min="1" value="${esc(r.total_telas)}" required></label></div>`,
      valores: f => ({ data_inicio: f.get("data_inicio"), data_fim: f.get("data_fim"), total_telas: Number(f.get("total_telas")) })
    },
    descartes: {
      titulo: "Editar quadro descartado",
      resumo: r => `${fmtDate(r.data)} — ${r.tamanho} — ${r.motivo}`,
      form: r => `<div class="form-grid">
        <label class="field">Data<input type="date" name="data" value="${dt(r.data)}" required></label>
        <label class="field">Tamanho${sel("tamanho", db.tamanhos, r.tamanho)}</label>
        <label class="field full">Motivo<input name="motivo" value="${esc(r.motivo)}"></label>
        <label class="field full">Observação<textarea name="observacao" rows="3">${esc(r.observacao)}</textarea></label></div>`,
      valores: f => ({ data: f.get("data"), tamanho: f.get("tamanho"), motivo: f.get("motivo"), observacao: f.get("observacao") })
    }
  };

  function semId() {
    alert("Este registro ainda não tem identificador. Recarregue a página (F5) e tente de novo.");
  }

  function editar(tab, r) {
    const cfg = CFG[tab];
    catAtual = null;
    $("modalTitle").textContent = cfg.titulo;
    const form = $("modalForm");
    form.innerHTML = cfg.form(r) + `<div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar alterações</button></div>`;
    form.onsubmit = async ev => {
      ev.preventDefault();
      const novo = cfg.valores(new FormData(form));
      if (supabaseClient) {
        if (r.id == null) { semId(); return; }
        const { data, error } = await supabaseClient.from(TAB[tab]).update(novo).eq("id", r.id).select();
        if (error) { alert("Não foi possível salvar: " + error.message); return; }
        if (!data || !data.length) { alert("Nada foi alterado. Provavelmente falta a permissão de edição no Supabase."); return; }
        Object.assign(r, data[0]);
      } else {
        Object.assign(r, novo);
      }
      closeModal();
      renderAll();
    };
    $("modal").classList.add("open");
  }

  async function excluirRegistro(tab, r) {
    if (!confirm("Excluir este registro?\n\n" + CFG[tab].resumo(r))) return;
    if (supabaseClient) {
      if (r.id == null) { semId(); return; }
      const { data, error } = await supabaseClient.from(TAB[tab]).delete().eq("id", r.id).select();
      if (error) { alert("Não foi possível excluir: " + error.message); return; }
      if (!data || !data.length) { alert("Nada foi excluído. Provavelmente falta a permissão de exclusão no Supabase."); return; }
    }
    db[tab] = db[tab].filter(x => x !== r);
    renderAll();
  }

  // ---------- Cliques ----------
  document.addEventListener("click", e => {
    const d = e.target.closest(".del-btn");
    if (d) { excluirNome(d.dataset.type, d.dataset.name); return; }
    const b = e.target.closest(".reg-btn");
    if (!b) return;
    const r = (regs[b.dataset.tab] || [])[Number(b.dataset.i)];
    if (!r) return;
    if (b.dataset.act === "edit") editar(b.dataset.tab, r);
    else excluirRegistro(b.dataset.tab, r);
  });

  // Se os dados já tiverem carregado antes deste arquivo, redesenha agora
  try { renderAll(); } catch (e) { /* o app.js desenha depois */ }
})();
