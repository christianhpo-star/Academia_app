# FORJA — Porções compartilhadas e nuggets (2026-11-15)

## Problema e decisão de UX

Combos de delivery podem ser anunciados como "para 3–4 pessoas" sem que isso seja uma medida nutricional ou uma descrição confiável do rendimento real. O FORJA **não divide alimentos pelo número de pessoas escrito no anúncio**. O fluxo assume **2 participantes como exemplo editável** (o usuário e outra pessoa) e registra **somente o que o usuário comeu**, sem criar um perfil ou diário para a outra pessoa.

Na aba Alimentação, a ação **Dividir uma porção** abre o mesmo editor de refeição já existente. O usuário escolhe um modelo, ajusta o peso de cada ingrediente na bandeja e a porcentagem que consumiu dele, vê uma prévia nutricional e confirma o registro. Pode informar 50% de tudo ou percentuais diferentes para cada ingrediente. A lista **Porções** também fica disponível dentro do catálogo da refeição.

## Modelos iniciais

- **Trono dos Reis:** batata frita, nuggets fritos, calabresa, molho com cheddar e bacon.
- **Batata com cheddar e bacon**.
- **Porção de nuggets**.
- **Porção de calabresa**.

Nuggets fritos e assados, calabresa frita, bacon frito, molho de requeijão com cheddar e queijo cheddar foram adicionados individualmente ao catálogo, com **peso livre em gramas**. Os modelos são pontos de partida, não cadastros oficiais dos restaurantes.

### Hipóteses apenas ilustrativas, não medição

O modelo Trono dos Reis começa com pesos não verificados: batata 300 g; nuggets 200 g; calabresa 160 g; molho 100 g; bacon 70 g. A participação padrão é 50%, podendo ser alterada por ingrediente. Os valores são **exemplos a serem revistos antes de salvar**, não uma estimativa visual precisa da foto. O número de pessoas do anúncio não altera a quantidade.

## Composição e origem

Fontes da TBCA (100 g de parte comestível):

| Ingrediente de referência | Código TBCA | kcal/100 g |
|---|---|---:|
| Nuggets congelados fritos em óleo de soja | BRC0474F | 339 |
| Nuggets congelados assados sem óleo | BRC0475F | 303 |
| Linguiça calabresa frita | BRC0898F | 325 |
| Bacon frito com alho e alecrim | BRC0941F | 655 |
| Molho de requeijão com queijo cheddar | BRC0137G | 330 |
| Queijo cheddar | BRC0090G | 404 |

Consultar a TBCA em https://www.tbca.net.br/; receitas, marcas e fritura do estabelecimento podem diferir muito. Batata frita mantém a referência da tabela TACO já existente no FORJA.

Cada ingrediente de uma porção compartilhada é salvo como uma **estimativa de baixa confiança**. O subtotal aproximado usa a referência de 100 g e a gramagem que o usuário atribui ao próprio consumo; um intervalo heurístico ilustrativo de ±40% mostra a incerteza de composição, **sem se apresentar como intervalo estatístico ou cálculo clínico**. A parte compartilhada entra em `recordedBreakdown`, mas não em `observedTotals` como se fosse um rótulo medido. Os valores são preservados no snapshot dos registros e nos backups existentes.

## Critérios de aceite

1. Catalogar nuggets fritos e assados separados; buscar por "nuggets", "calabresa", "bacon" e "cheddar".
2. Não usar "3–4 pessoas" na conversão de quantidades.
3. Permitir dois participantes, default de 50% e ajuste de percentual por ingrediente, inclusive nenhum.
4. Exibir prévia de kcal, macronutrientes e peso próprio, identificados como estimativas.
5. Registrar **apenas a parte própria**, sem auto-lançamento da refeição da outra pessoa.
6. Preservar entradas e backups antigos, rascunhos, edição posterior e dados offline.
7. Testar divisão desigual, valores inválidos e persistência no navegador móvel.

## Limitação

Não é possível obter os pesos ou a composição real do Trono dos Reis apenas da foto. Mesmo com referências TBCA, o usuário deve revisar os valores. O aplicativo não acessa nem altera o histórico da esposa e não cria uma refeição sem confirmação.
