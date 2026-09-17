# CONTROLE DE TELAS | INDEMETAL — V1.1

Sistema de controle de telas com dados históricos da planilha CONTROLE DE TELA RASGADA.xlsx.

## O que mudou nesta versão
- Banco de dados Supabase gerenciado pelo Verdent (conector integrado) — não é preciso criar projeto no Supabase manualmente.
- Dados históricos importados para o banco: 247 ocorrências de telas rasgadas, 16 lançamentos de desplaque, 15 ciclos de banho, 74 quadros descartados (2023–2026) e cadastros (operadores, motivos, tamanhos).
- Login obrigatório via Supabase Auth (e-mail/senha) quando o app está publicado no Verdent.
- Desplaque agora grava a DATA do lançamento (antes gravava só o mês), permitindo filtrar por ano no dashboard e evitando mistura de anos a partir de 2027.
- Gráfico de desplaque mostra Etiquetas e Gráficos (duas linhas) e respeita o filtro de período.

## Modo demonstração
Abrindo o app fora do Verdent (ex.: dar duplo clique no index.html), ele roda em modo demonstração com os dados embutidos em assets/seed.js — útil para conferir a aparência sem login.

## Publicação
Publicar pelo botão Publish do Verdent. O build (npm ci + npm run build) gera a pasta dist/ automaticamente.

## Primeiro acesso (fazer 1x)
1. Publique o projeto e abra a URL.
2. Clique em Entrar e cadastre sua conta (e-mail + senha) no modal de autenticação.
3. Avise o Verdent para restringir as policies do banco ao seu usuário — assim nenhum outro cadastro consegue ler ou gravar dados.

## Estrutura
- index.html — interface
- assets/app.js — lógica e telas
- assets/seed.js — dados históricos embutidos (fallback/demo)
- src/auth-init.js — integração Supabase Auth (empacotada em assets/vendor.js)
- schema.sql — schema de referência do banco
- scripts/ — migração e importação de dados (registro histórico da implantação)
