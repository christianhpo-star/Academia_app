# FORJA — Evolução: Peso e Nutrição (16/11/2026)

## Objetivo
Adotar a hierarquia e organização visual das duas capturas fornecidas pelo usuário, sem copiar logos ou dados de outro aplicativo. A nova tela de **Evolução** possui o seletor **Peso | Nutrição** e mantém a navegação principal do FORJA. A tela tem uma área editorial clara e cabeçalho verde-menta, com tipografia e proporções próximas das referências.

## Peso
- Três indicadores no topo: peso inicial (configurado), peso atual (última pesagem conhecida) e peso desejado (meta), apresentados separadamente; o registro inicial não é assumido como nova pesagem.
- Botão primário **Adicionar uma pesagem** que direciona ao formulário já existente no mesmo documento.
- Gráfico SVG com linha contínua suave, pontos, datas e linha tracejada da meta. Dados só vêm de `state.weights`. A meta não é uma pesagem.
- Lista de pesagens por data, inicialmente resumida em oito entradas, com botão **Ver mais**.
- Sem novos campos persistidos, importações artificiais ou mudanças de objetivo.

## Nutrição
- **Objetivo (kcal)**: série diária e linha horizontal da meta ativa, com seletor 7 / 30 / 90 dias.
- **Distribuição de macros (%)**: dois anéis. Externo representa a participação energética aproximada dos lipídios (9 kcal/g), proteínas (4 kcal/g) e carboidratos (4 kcal/g) a partir das médias em gramas registradas; interno representa a participação energética aproximada das metas, quando presentes. A energia declarada dos alimentos não é recalculada por 9/4/4. A legenda mostra as porcentagens. A fibra fica em um indicador separado — adicionar fibras no mesmo anel provocaria dupla contagem, uma vez que fibra já é uma fração dos carboidratos.
- **Média de macronutrientes (g)**: barras das médias em gramas de lipídios, proteínas, carboidratos e fibras, com traços horizontais das metas quando disponíveis. Períodos 7 / 30 / 90 dias independentes.
- Cada série usa `nutrition.entries`, `N.recordedBreakdown` e `G.active`, **sem inventar refeições** e sem converter dia ausente em 0.
- Registros de baixa confiança (porções estimadas, açaí etc.) continuam aproximados e explicitados; subtotais não representam necessariamente toda a ingestão do dia.

## Navegação e restrições de escopo
- **Evolução** passa a ter duas guias. Abaixo, a seção recolhível **Treinos, medidas e indicadores adicionais** acomoda medidas, passos, força, radar, recomendações por objetivo e dose flexível.
- A ação **Registrar ou revisar refeições** encaminha à aba Alimentação, sem abrir um segundo editor.
- Os históricos reais continuam no armazenamento local existente; nenhuma migração destrutiva, novo identificador ou alteração de esquema foi necessária.
- Não copiar nome, peso, meta calórica ou pontos das capturas; são apenas referência de composição.
- Estilo mobile-first com 320px e 390px, `aria-label` nos gráficos, botões com alturas adequadas, estados vazios e claro contraste.

## Testes
- `tests/evolution-dashboard.test.cjs` valida filtros, valores observados, ausência de inventar dias, fibras fora do donut e nomes das seções.
- Os smoke tests devem preservar a navegação aos componentes antigos por meio do accordion de métricas suplementares.
- Validar também em Android real: experiência de toque, teclado numérico, rolagem, contraste, retorno ao diário e preservação dos dados locais.
