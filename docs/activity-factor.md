# FORJA UX13 — fator de atividade orientado pelo histórico

## Objetivo e fonte dos dados

O fator de atividade da fórmula de Mifflin–St Jeor (gasto de manutenção = taxa metabólica de repouso × fator informado) **não é medido pelo aplicativo**. O FORJA pode sugerir **uma categoria inicial, explicitamente heurística**, com base na distribuição de passos digitados a partir do Samsung Health e nas sessões de musculação/Muay Thai **concluídas e registradas**.

- `activitySteps[]`: registros `{id:"steps-AAAA-MM-DD",date:"AAAA-MM-DD",steps:inteiro,source:"samsung-health-manual"}`. Passos são informados manualmente, sem API Samsung nem autorização ao Health Connect. Zero é possível quando informado explicitamente; ausência de dia não significa zero.
- `sessions[]` e `muay.sessions[]`: sessões reais concluídas. Dias ativos distintos não são confundidos com número de sessões; treinos não concluídos/rascunhos não contam.
- `bioimpedance[]`: medições indiretas do Galaxy Watch; não são substitutas da taxa metabólica medida e não alteram o fator nem as metas automaticamente.
- Valores persistem no `localStorage`, integram o backup original e a exportação única para IA, permanecendo privados no dispositivo. O arquivo exportado só sai do dispositivo quando o usuário decide compartilhar.

## Janela e tratamento de lacunas

A visualização apresenta 7/14/28 dias. As médias são calculadas *somente entre os dias que têm registro* e explicitamente rotuladas assim; não se infere atividade, descanso ou zero nos dias ausentes.

A sugestão numérica requer pelo menos sete registros de dias distribuídos ao longo de uma semana, sem concentração quase exclusiva em dias com exercícios registrados. Para uma melhor indicação de cobertura, são marcados:
- **limitada:** histórico curto e/ou dispersão insuficiente;
- **moderada:** ≥14 dias de passos ao longo de ≥14 dias corridos;
- **ampla:** ≥21 dias de passos ao longo de ≥21 dias corridos.

A cobertura se refere aos registros, **não** à validade fisiológica da estimativa.

## Regras conservadoras, exclusivamente convenções de produto

As faixas abaixo servem apenas para classificar e comparar o histórico, **não são fórmulas publicadas que convertem passos em PAL**.

| Média nos dias registrados | Categoria inicial |
| --- | --- |
| Menos de 4.000 passos | 1,20 |
| De 4.000 a 7.499 passos | 1,375 |
| De 7.500 a 10.999 passos | 1,55 |
| 11.000 ou mais passos | 1,725 |

Com cobertura **moderada ou ampla**, pelo menos seis dias distintos com treinos concluídos nos últimos 14 dias e média ≥4.000 passos registrados, a sugestão pode avançar **no máximo uma categoria**. Jamais sugerir 1,90 automaticamente. Isso **não** soma calorias de treino aos passos ou à fórmula; é apenas escolha conservadora de categoria.

Faixas de incerteza de exibição são amplas e ilustrativas (p. ex., um fator sugerido 1,55 é acompanhado de 1,375–1,725). São convenções heurísticas, não intervalos de confiança estatísticos.

## Decisões do usuário

1. O app mostra a evidência e as lacunas, mas **nunca altera o perfil automaticamente**.
2. **Usar fator sugerido** apenas preenche o seletor do formulário, sem salvar.
3. **Salvar perfil e calcular** persiste a escolha e mostra metas ainda não aplicadas.
4. **Aceitar metas a partir de hoje** salva uma nova meta somente após confirmação. Metas manuais/profissionais são preservadas até essa decisão.
5. Revisão de tendências (peso, medidas, desempenho e rotina) após algumas semanas é recomendada; não ajustar por uma única pesagem ou sessão.

## Limites e evolução futura

Estimar gasto energético com confiança a partir de passos e sessões sem conhecer trabalho, movimento cotidiano de membros superiores, intensidade, duração, sono e restrições de movimento não é possível. Equações e fatores são **estimativas de partida**; validar com trajetória longitudinal, preferencialmente com apoio profissional se necessário.

O módulo não sincroniza dados do Samsung Health. Uma futura conexão poderá ser pesquisada separadamente, com consentimento, permissões e estratégia de custo/privacidade. Nenhum token privado ou dados reais devem ser adicionados ao GitHub.

### Referências para princípios gerais (não para os limiares inventados do FORJA)

- Mifflin et al. 1990: equação de metabolismo de repouso. https://pubmed.ncbi.nlm.nih.gov/2305711/
- Tudor-Locke & Bassett, 2004: categorias descritivas de passos e limitações. https://pubmed.ncbi.nlm.nih.gov/14715035/
- NIDDK Body Weight Planner: variação do nível de atividade e dinâmica do peso. https://www.niddk.nih.gov/bwp

### QA

- `node --test tests/activity.test.cjs`: datas, validação, merge, lacunas, treino duplo, amostras curtas e faixa de atividade.
- `python3 tests/smoke_activity.py`: fluxo mobile com dados **sintéticos**, nenhuma meta automática, BIA, exportação privada e compatibilidade com backup antigo.
