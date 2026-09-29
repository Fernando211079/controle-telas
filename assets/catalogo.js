/* catalogo.js
   - Coloca os cards Operadores / Motivos / Tamanhos dentro da tela "Telas rasgadas"
   - Adiciona o botão de excluir (×) em cada item (aqui e na tela Cadastros)
   Carregar DEPOIS do app.js. */
(function () {
  // 1) Estilo do botão de excluir e da lista com rolagem
  const st = document.createElement("style");
  st.textContent = `
    .list-item{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .del-btn{flex:none;width:26px;height:26px;border:0;border-radius:6px;background:#fdecea;color:#e1261c;font-size:17px;font-weight:700;line-height:1;cursor:pointer}
    .del-btn:hover{background:#e1261c;color:#fff}
    .list.scroll{max-height:230px;overflow-y:auto}
    .catalog-row{margin-bottom:18px}
  `;
  document.head.appendChild(st);

  // 2) Cards de cadastro dentro da tela Telas rasgadas (logo abaixo do botão + Nova ocorrência)
  const tools = document.querySelector("#page-ocorrencias .page-tools");
  if (tools) {
    const bloco = document.createElement("div");
    bloco.className = "grid three catalog-row";
    bloco.innerHTML = `
      <article class="panel"><h2>Operadores</h2><div class="list scroll" id="ocOperatorsList"></div><button class="secondary" onclick="openCatalog('operadores')">+ Adicionar operador</button></article>
      <article class="panel"><h2>Motivos</h2><div class="list scroll" id="ocReasonsList"></div><button class="secondary" onclick="openCatalog('motivos')">+ Adicionar motivo</button></article>
      <article class="panel"><h2>Tamanhos</h2><div class="list scroll" id="ocSizesList"></div><button class="secondary" onclick="openCatalog('tamanhos')">+ Adicionar tamanho</button></article>
    `;
    tools.insertAdjacentElement("afterend", bloco);
  }

  // 3) Nova versão do renderCadastros: preenche as duas telas e mostra o botão de excluir
  window.renderCadastros = function () {
    const make = (type, ids) => {
      const nomes = [...new Set(db[type])]; // tira nomes repetidos da exibição
      const html = nomes.length
        ? nomes.map(x => `<div class="list-item"><span>${esc(x)}</span><button type="button" class="del-btn" data-type="${type}" data-name="${esc(x)}" title="Excluir">×</button></div>`).join("")
        : '<div class="empty">Nenhum item.</div>';
      ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
    };
    make("operadores", ["operatorsList", "ocOperatorsList"]);
    make("motivos", ["reasonsList", "ocReasonsList"]);
    make("tamanhos", ["sizesList", "ocSizesList"]);
  };

  // 4) Excluir item do cadastro
  async function deleteCatalog(type, name) {
    if (!confirm(`Excluir "${name}" da lista?\n\nOs registros antigos que já usam esse nome continuam no histórico.`)) return;
    const table = { operadores: "operadores", motivos: "motivos", tamanhos: "tamanhos_tela" }[type];
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from(table).delete().eq("nome", name).select();
      if (error) { alert("Não foi possível excluir: " + error.message); return; }
      if (!data || !data.length) { alert("Nada foi excluído. Provavelmente falta a permissão de exclusão no Supabase."); return; }
    }
    db[type] = db[type].filter(x => x !== name);
    renderCadastros();
  }

  document.addEventListener("click", e => {
    const b = e.target.closest(".del-btn");
    if (b) deleteCatalog(b.dataset.type, b.dataset.name);
  });

  // Se os dados já tiverem carregado antes deste arquivo, atualiza as listas agora
  try { renderCadastros(); } catch (e) { /* ainda sem dados, o app.js desenha depois */ }
})();
