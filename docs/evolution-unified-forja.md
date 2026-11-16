# FORJA — Evolução unificada (revisão visual de 16/11/2026)

Correção do design após captura real de uso: o cabeçalho menta e as superfícies brancas faziam a Evolução parecer um segundo aplicativo dentro do FORJA. Nova interface respeita a topbar e a navegação principal do FORJA e utiliza os mesmos tokens `--bg`, `--card`, `--text`, `--muted`, `--lime` e `--blue` das demais abas. Não há novos campos de armazenamento nem migração de dados.

## Navegação e hierarquia
- Subtítulo compacto **Sua evolução** com uma guia nativa **Corpo | Nutrição** em vez de um cabeçalho adicional.
- **Corpo**: indicadores peso inicial/atual/meta e CTA de pesagem; um gráfico principal com mini-seletor **Peso | Medidas**; imediatamente depois, **Movimento diário** (passos); logo depois, **Treino por grupo** com barras A, B, C e D; histórico de pesagens recolhível; ferramentas de medidas detalhadas, objetivo e dose dentro de uma seção secundária recolhível; formulário de pesagem fechado até solicitação.
- **Medidas**: escolha de uma das regiões cadastradas, com gráfico de linha apenas das aferições reais daquele campo. No máximo as últimas 30 leituras da região. Uma medição isolada é exibida como ponto, não como tendência. Acesso ao mapa corporal e editor já existentes por um botão, sem segundo aplicativo e sem criar novas anotações fictícias.
- **Treino por grupo**: número de séries efetivas com carga e repetições realmente registradas, exceto aquecimentos. Agrupar pelo campo `group` dos exercícios A (costas/bíceps), B (peito/tríceps), C (quadríceps) e D (posterior/glúteos), períodos 7/30/90 dias. Isso **não** informa exatamente quais músculos receberam trabalho, nem soma cargas de máquinas diferentes, e não atribui sessões de Muay Thai a séries de musculação.
- **Nutrição** mantém os três gráficos 7/30/90 dias existentes e sua distinção entre registros conhecidos, estimados e ausentes, agora com contraste escuro consistente.

## Persistência, segurança e acessibilidade
- Dados pessoais continuam armazenados apenas no dispositivo e em backups exportados pelo usuário, sem valores de testes incluídos no aplicativo.
- Os estados vazios não viram valores zero. Botões têm `aria-pressed`, gráficos têm nomes acessíveis e controles possuem área de toque dimensionada.
- O service worker recebe um novo namespace de cache para carregar CSS/JS atualizados, preservando os registros.
- Testes: unidade de medidas e séries efetivas, Playwright em 320 e 390 px, abertura de medidas, período, peso, nutrição, histórico, ações antigas e ausência do radar. Validar também manualmente no celular.
