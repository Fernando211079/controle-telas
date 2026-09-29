/* catalogo.js
   - Botões Operadores / Motivos / Tamanhos na tela "Telas rasgadas" (ao lado de + Nova ocorrência)
   - Cada botão abre uma janela para adicionar e excluir itens da lista
   - Botão de excluir (×) também na tela Cadastros
   Carregar DEPOIS do app.js. */
(function () {
  const TITULOS = { operadores: "Operadores", motivos: "Motivos", tamanhos: "Tamanhos" };
  const SINGULAR = { operadores: "operador", motivos: "motivo", tamanhos: "tamanho" };
  const TABELAS = { operadores: "operadores", motivos: "motivos", tamanhos: "tamanhos_tela" };
  let catAtual = null;

  // 1) Estilo
  const st = document.createElement("style");
  st.textContent = `
    .list-item{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .del-btn{flex:none;width:26px;height:26px;border:0;border-radius:6px;background:#fdecea;color:#e1261c;font-size:17px;font-weight:700;line-height:1;cursor:pointer}
    .del-btn:hover{background:#e1261c;color:#fff}
    .list.scroll{max-height:300px;overflow-y:auto}
    .cat-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  `;
  document.head.appendChild(st);

  // 2) Botões ao lado do "+ Nova ocorrência"
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

  // 3) Janela do cadastro
  function abrirCadastro(tipo) {
    catAtual = tipo;
    document.getElementById("modalTitle").textContent = TITULOS[tipo];
    const form = document.getElementById("modalForm");
    form.innerHTML = `
      <div class="form-grid"><label class="field full">Adicionar ${SINGULAR[tipo]}<input id="catNovo" placeholder="Digite o nome e tecle Enter" autocomplete="off"></label></div>
      <div class="list scroll" id="catLista" style="margin-top:14px"></div>
      <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Fechar</button><button class="primary">Adicionar</button></div>`;
    form.onsubmit = e => { e.preventDefault(); adicionar(); };
    preencherLista();
    document.getElementById("modal").classList.add("open");
    setTimeout(() => { const i = document.getElementById("catNovo"); if (i) i.focus(); }, 50);
  }

  function itensHtml(tipo) {
    const nomes = [...new Set(db[tipo])];
    return nomes.length
      ? nomes.map(x => `<div class="list-item"><span>${esc(x)}</span><button type="button" class="del-btn" data-type="${tipo}" data-name="${esc(x)}" title="Excluir">×</button></div>`).join("")
      : '<div class="empty">Nenhum item.</div>';
  }

  function preencherLista() {
    const el = document.getElementById("catLista");
    if (el && catAtual) el.innerHTML = itensHtml(catAtual);
  }

  async function adicionar() {
    const campo = document.getElementById("catNovo");
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

  // 4) Nova versão do renderCadastros (tela Cadastros + lista da janela)
  window.renderCadastros = function () {
    const make = (tipo, id) => { const el = document.getElementById(id); if (el) el.innerHTML = itensHtml(tipo); };
    make("operadores", "operatorsList");
    make("motivos", "reasonsList");
    make("tamanhos", "sizesList");
    preencherLista();
  };

  // 5) Excluir item
  async function excluir(tipo, nome) {
    if (!confirm(`Excluir "${nome}" da lista?\n\nOs registros antigos que já usam esse nome continuam no histórico.`)) return;
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from(TABELAS[tipo]).delete().eq("nome", nome).select();
      if (error) { alert("Não foi possível excluir: " + error.message); return; }
      if (!data || !data.length) { alert("Nada foi excluído. Provavelmente falta a permissão de exclusão no Supabase."); return; }
    }
    db[tipo] = db[tipo].filter(x => x !== nome);
    renderCadastros();
  }

  document.addEventListener("click", e => {
    const b = e.target.closest(".del-btn");
    if (b) excluir(b.dataset.type, b.dataset.name);
  });

  try { renderCadastros(); } catch (e) { /* o app.js desenha depois */ }
})();
