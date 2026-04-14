# GM Store — Projeto de Dashboard

## Contexto
Projeto desenvolvido por **Bruno Amandula**, CEO da **Vem no Digital** — assessoria de marketing de performance e tecnologia. A GM Store é cliente da agência.

## O que é este projeto
Dashboard de performance de marketing digital para a GM Store, substituindo os relatórios do Reportei. Conecta diretamente com a API do Meta Ads e exibe dados em tempo real.

## Arquivo principal
`gmstore_dashboard_live.html` — abre direto no navegador, sem servidor, sem instalação.

## Como usar
1. Abrir o arquivo `gmstore_dashboard_live.html` no navegador
2. Na primeira vez, preencher a tela de configuração com:
   - **Access Token** do Meta (obtido em developers.facebook.com/tools/explorer)
   - **ID da Conta de Anúncios** — formato `act_XXXXXXXXXX` (o prefixo `act_` é adicionado automaticamente se esquecer)
3. As credenciais ficam salvas no `localStorage` do navegador — não precisam ser reinseridas
4. Selecionar o período desejado e clicar em **Buscar**

## Estrutura do negócio
- **1 conta de anúncios** no Meta Ads
- **2 lojas** separadas por nome de campanha:
  - Loja **STA** — campanhas com a palavra-chave `STA`
  - Loja **Castelo** — campanhas com a palavra-chave `CASTELO`
- Campanhas focadas em **conversas no WhatsApp**
- CRM utilizado: **Kommo** (integração pendente — próximo passo)

## O que o dashboard exibe
- Métricas gerais: investimento, alcance, impressões, cliques, conversas, CPM, custo/conversa
- Funil de conversão visual com taxa entre etapas
- Performance separada por loja (STA / Castelo)
- Tabela de campanhas ranqueadas por eficiência (custo/conversa)
- Tabela de anúncios com performance por criativo
- Gráficos: investimento por campanha, ranking de custo/conversa, conversas por loja, alcance por campanha
- Alertas estratégicos automáticos (melhor e pior campanha)
- Filtros: período livre, presets (7d, 30d, mês atual, mês anterior), filtro por loja
- Exportação em PDF via impressão do navegador

## Permissões necessárias no Meta
- `ads_read`
- `ads_management`
- `instagram_basic`
- `instagram_manage_insights`

## Próximos passos planejados
- [x] Análise automática de métricas — implementada na aba "Análise Estratégica" (v2.0)
- [ ] Integração com Kommo CRM para puxar dados de vendas e calcular ROI real
- [ ] Dados de Instagram orgânico (seguidores, alcance, reels)
- [ ] Comparativo automático entre meses (histórico vs período atual)
- [ ] Campo de vendas fechadas para cálculo de custo por venda

## Dados de Março 2026 (pré-carregados)
- Faturamento Online: R$10.403
- Faturamento Total STA (Santa Luzia): R$76.000
- Faturamento Total Castelo: R$37.000
- Vendas online (qtd): pendente — usuário vai informar
- ROAS março: ~7,45x

## GitHub Pages
- Repositório: `vemnodigital/gm-store-dashboard` (público, branch main)
- URL: https://vemnodigital.github.io/gm-store-dashboard/gmstore_dashboard_live.html
- Status: online e funcionando desde 09/04/2026

## Histórico de sessões

### 08/04/2026
- Análise do relatório de março da GM Store (PDF do Reportei)
- Criação do dashboard estático com dados de março (`dashboard_gmstore_marco.html` em Downloads)
- Criação do dashboard live com conexão real à API do Meta (`gmstore_dashboard_live.html`)
- Correção do erro `(#100) Tried accessing nonexisting field (insights)` — causado pelo ID da conta sem prefixo `act_`
- Adicionada validação e normalização automática do ID da conta
- Projeto movido para `Desktop/claude_code/gm_store/`

### 09/04/2026
- Adicionado modal de vendas com 3 seções: Vendas Online, Loja STA, Loja Castelo
- Adicionados cards: Faturamento Online, Fat. Total das Lojas, Custo por Venda, ROAS
- ROAS calculado automaticamente (fat. online ÷ investimento) com cor dinâmica (verde ≥ 3x, azul ≥ 1,5x, vermelho < 1,5x)
- Dados de março pré-carregados no localStorage
- Tentativa de publicar no GitHub Pages — erro 404 pendente de resolução
- Repositório configurado do zero com git init + push para vemnodigital/gm-store-dashboard
- GitHub Pages ativado (repo público, branch main) — dashboard online

### 14/04/2026 — Versão 2.0
- Dados reais importados de planilha Excel (GM Store 6 Meses.xlsx) — Out/2025 a Abr/2026
- Adicionada navegação por abas: **Performance Live** e **Análise Estratégica**
- Nova aba "Análise Estratégica" com:
  - Insights automáticos: melhor mês, melhor ROAS, alertas de queda de leads, campanha mais/menos eficiente
  - Ranking de meses com medalhas, ordenado por faturamento + colunas Investimento, ROAS, Custo/Venda, Custo/Lead
  - 6 gráficos históricos: faturamento, leads, vendas, ticket médio, investimento Meta, ROAS por mês
  - Ranking de campanhas e criativos via API
- Investimento histórico mensal buscado automaticamente da API Meta Ads ao abrir a aba
- Pré-carregamento automático de vendas de todos os 7 meses (do Excel) no localStorage
- Correção do ROAS: usa faturamento total (STA + Castelo + Online) ÷ investimento
- GitHub CLI instalado e autenticado (conta: vemnodigital)
- Commits publicados: `c3cacbf`, `eeceda6`, `f7977a5`, `2aeb020`

### 14/04/2026 — Versão 2.1 (PENDENTE — limite de sessão atingido)
**Próxima implementação a fazer ao retomar:**
- [ ] Seletor de período próprio na aba Análise (presets: 30d, 90d, 6m, 1a) com botão Buscar independente
- [ ] Variáveis separadas: `dadosAnalisecamp`, `dadosAnaliseAdsets`, `dadosAnaliseAds`
- [ ] Seção **Conjuntos de Anúncios** (adsets) com: Nome, Loja, Investido, Conversas, Custo/Conv, **Frequência**, CTR, Status
  - Frequência ≥ 3 = "Saturado" (vermelho) → trocar criativo
  - Frequência 2–3 = "Atenção" (amarelo)
  - Frequência < 2 = "Ok" (verde)
- [ ] Adicionar coluna **Frequência** na tabela de criativos
- [ ] Insights automáticos de frequência: alerta se conjuntos saturados
- [ ] Insights de CTR baixo: criativos com CTR < 1% e gasto > R$50
- [ ] Campos da API para adsets: `adset_name, campaign_name, spend, reach, impressions, inline_link_clicks, cpm, ctr, frequency, actions, cost_per_action_type`
- [ ] `renderAnaliseCampanhas` e `renderAnaliseCriativos` devem usar as novas variáveis (não mais `dadosCamp`/`dadosAds` da Performance)
- [ ] Inicializar período da análise com 6 meses no `window.onload`
