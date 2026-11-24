# Revisão de cobertura do Treino A — deltoide posterior e trapézio superior

**Objetivo:** preencher lacunas de exercícios específicos com o menor acréscimo viável de séries, evitando duplicar a rotina B ou aumentar automaticamente o treino em dias de Muay Thai. Esta decisão é uma sugestão inicial editável, não uma prescrição clínica nem uma afirmação de que o músculo esteja inativo nos outros exercícios.

## Decisão aplicada à ficha

| Região | Exercício | Local | Dose inicial | Estado |
|---|---|---|---|---|
| Deltoide posterior | Voador inverso / peck deck inverso | A, após remadas e antes de bíceps | 2 séries, 12–20 repetições | Ativo se não há outra opção posterior ativa no arquivo anterior |
| Trapézio superior | Encolhimento de ombros com halteres | A, final do bloco; opção na edição | 2 séries, 10–15 repetições | **Inativo até escolha do usuário** |

A máquina oferece uma alternativa de movimento simples para o ombro posterior, com opção de substituição por face pull ou crucifixo inverso (catálogo A), **não como outros acréscimos cumulativos**. As remadas seguem treinando dorsais e musculatura escapular; não foram removidas nem duplicadas. O encolhimento permite estímulo específico do trapézio superior quando desejado, mas não é obrigatório para recomposição corporal. Trapézio médio já participa das remadas, e deltoide anterior/lateral recebe estímulo em supinos e elevações laterais.

Não adicionamos desenvolvimento de ombros, elevação frontal, outra remada nem novos isoladores de tríceps ao bloco B, porque isso reproduziria parte do estímulo já presente sem uma lacuna igualmente clara. Não se acrescenta trabalho novo ao bloco D apenas porque uma sessão isolada tenha terminado com menos exercícios; é um dia de cadeia posterior que pode demandar bastante recuperação.

## Avaliação dinâmica de cargas e prontidão

A aba de catálogo existente já apresenta o volume realmente registrado no dia e nos últimos 7 dias, soma séries diretas e parcelas auxiliares em indicadores **aproximados** e considera objetivo, Muay Thai, fadiga e desconforto. Um treino não registrado não pode ser inferido. O encolhimento permanece opção para o usuário ativar em *Editar ficha*; não deve aparecer como etapa obrigatória. Treinos livres e Muay não mudam a rodada A/C/B/D, e golpes não viram séries de hipertrofia.

Concluir **aquecimento** ou preencher somente uma carga sugerida não acrescenta série à análise. Se o usuário treinou deltoide posterior em uma sessão livre, o volume entra no mapa e nas avaliações do catálogo. O complemento A pode ser pulado se houver fadiga, dor, atividade recente relevante ou limite de tempo; não compensar com mais séries nos próximos dias.

A revisão do volume deve ocorrer após registros comparáveis de execução, esforço e recuperação (por exemplo, algumas semanas), observando desempenho, aderência e sintomas, antes de alterar a dose inicial. `RIR 1–3` pode ser uma referência prática para execução controlada, mas não uma garantia de hipertrofia e tampouco motivo para treinar cada série até a falha.

## Evidência — limites relevantes

1. Currier et al. (2026), *ACSM Position Stand*, **Medicine & Science in Sports & Exercise**, DOI `10.1249/MSS.0000000000003897`: síntese de 137 revisões; volume semanal se associa à hipertrofia, mas o número ideal individual de séries não foi estabelecido. Não é obrigatório treinar até a falha.
2. Pelland et al. (2026), *The Resistance Training Dose Response*, **Sports Medicine**, DOI `10.1007/s40279-025-02344-w`: análise de 67 estudos; contagem fracionada de séries indiretas apresenta bom ajuste estatístico, com retornos decrescentes. **0,5× indiretas é um modelo de estimativa, não medição individual.**
3. Nunes et al. / revisão sistemática sobre variação de exercícios, DOI conforme PubMed `35438660`: uma variação sistemática pode ajudar a cobertura regional, mas alternância aleatória ou múltiplas variantes redundantes podem dificultar a progressão.
4. *Activation of the Three Deltoid Muscle Portions During Common Strengthening Exercises*, revisão sistemática, PMID `39593452`: diferentes movimentos apresentam perfis distintos de ativação eletromiográfica. **EMG não mede diretamente hipertrofia**, portanto não ordenamos opções como garantia de crescimento.
5. Robinson et al. (2024), *Proximity to failure, strength and hypertrophy*, DOI `10.1007/s40279-024-02069-2`: a relação é exploratória e não define um RIR obrigatório universal.

**Confidencialidade:** não incorporar dados de treino individuais, medidas corporais nem backups pessoais ao repositório. A lógica usa apenas o histórico local do aplicativo.

## Compatibilidade

- `DATA.ensureUpperBalance` é migração aditiva e independente das versões de abdômen e prancha. Acrescenta somente IDs ausentes; não altera sessões salvas, rascunho, objetivos, Muay, refeições ou cargas.
- Preserva campos e ativação/desativação de `voador-inverso` e `encolhimento-halteres` que já existam no armazenamento do usuário.
- Se já houver alternativa específica de deltoide posterior **ativa**, não ativa também a nova por padrão.
- Confere limite de 200 exercícios antes de inserir ambos; operação atômica, sem migração parcial.
- A rotação permanece `['A','C','B','D']`. Nada marca treino como concluído sem execução.
- Testes de regressão: `tests/upper-balance-plan.test.cjs` e `tests/smoke_upper_balance.py`, além da validação completa do FORJA.
