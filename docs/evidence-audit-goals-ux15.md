# Auditoria documental e científica FORJA — UX15 (15/11/2026)

## Método e escopo

Auditoria do código de `nutrition-goals.js`, `nutrition-catalog.js`, `activity.js`, `goal-planner.js`, `app.js` e seus testes, confrontada com artigos, diretrizes e bases públicas. **A presença de uma referência não significa que ela valida limiares específicos escolhidos pelo produto.** Esta é uma avaliação de software de apoio, não avaliação individual ou prescrição clínica.

Estado da evidência: **bem estabelecido** (equação, princípios gerais de atividade e treino); **condicional** (proteína/energia ajustadas ao indivíduo); **heurística do produto** (categoria PAL por passos, faixas iniciais e prazo); **dado insuficiente** (gasto real individual, ingestão incompleta e bioimpedância isolada).

## Matriz de auditoria

| Regra existente | Fundamento e ressalva | Decisão de produto |
| --- | --- | --- |
| Mifflin–St Jeor em `nutrition-goals.js` | Equação publicada para estimar RMR, não calorimetria; variação individual significativa | Manter como estimativa de partida com aviso |
| Gasto diário = RMR × fator de atividade | Aproximação para manutenção; atividade habitual é incerta | Não somar calorias de exercícios ou Samsung Health novamente |
| PAL por passos `activity.js` | Patamares e elevação por frequência são convenções do FORJA, **não** equação validada para PAL | Manter somente como categoria exploratória, com cobertura e confirmação |
| Energia 0,9× manutenção para perda ou 1,05× para ganho em `nutrition-goals.js` | Multiplicadores fixos não garantem resultado nem atendem necessariamente à situação clínica | Marcar como ponto de partida editável; auditá-los por evolução longitudinal |
| Proteína 1,8 g/kg, gordura 25%, fibras 25 g | Opções gerais possíveis em adultos, sem universalidade para todos os casos | Exibir como referências; permitir metas manuais/profissionais e não inferir prescrição |
| Carga/progressão e 5–6 sessões semanais | Individualização, volume e recuperação prevalecem sobre adicionar sessões indiscriminadamente | Exibir orientações por objetivo, sem automatizar cargas ou volumes pelo prazo |
| Resumos Samsung Health e BIA | Relógio estima energia e composição; ausência de registro não é zero | Separar dados observados, aproximados e não observados |
| Catálogo alimentar genérico e sem identificadores verificáveis | Porção, preparo e fonte variam; não corresponde a base padronizada referenciada | Não atribuir falsa certeza. Planejar integração por ID de fonte verificável |

## Objetivos e segurança

Cinco modos de seleção: alcançar peso na data, recomposição corporal, redução de gordura, ganho de massa, manutenção.

- Peso-alvo e data são **preferências**, não contrato de resultados.
- O ritmo em kg/semana e %/semana é **matemático**, não previsão. O modelo atual **não** implementa o simulador dinâmico de peso do NIDDK, nem usa a regra fixa de 7.700 kcal por kg.
- Um prazo excedendo 1% do peso corporal por semana recebe alerta para revisão; não se calculam calorias maiores/menores para obedecer à data.
- Intervalos iniciais de energia são explicitamente **heurísticos do produto** e **não aplicados** automaticamente: redução ~85–95% da manutenção estimada, ganho ~102–105%, manutenção 97–103%. O limite inferior não pode ficar abaixo do repouso estimado; intervalos são alternativas para discutir e ajustar, não prescrições.
- Para adultos com treino resistido e perfil confirmado, o módulo apresenta apenas faixa informativa de proteína ~1,6–2,2 g/kg/dia. Contextos clínicos ou falta de dados exigem orientação individual.
- Com histórico de peso recente insuficiente, metas precisam indicar incerteza, não prometer projeções exatas. Rever tendências após 2–4 semanas em condições consistentes.

## Referências nucleares e o que elas NÃO demonstram

1. **Mifflin MD et al. (1990)**. A new predictive equation for resting energy expenditure in healthy individuals. *Am J Clin Nutr*. DOI: 10.1093/ajcn/51.2.241. https://pubmed.ncbi.nlm.nih.gov/2305711/ — equação para estimativa de gasto em repouso; não valida o fator de passos usado no FORJA.
2. **Hall KD et al. (2011)**. Quantification of the effect of energy imbalance on bodyweight. *Lancet*. DOI: 10.1016/S0140-6736(11)60812-X. https://pubmed.ncbi.nlm.nih.gov/21872751/ — mudanças de peso envolvem dinâmica adaptativa; o módulo UX15 não implementa esse modelo.
3. **NIDDK / NIH**, Body Weight Planner. https://www.niddk.nih.gov/bwp — referência de modelagem dinâmica e limites do cálculo simplificado; não significa endosso do FORJA.
4. **Morton RW et al. (2018)**. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength. *Br J Sports Med*. DOI: 10.1136/bjsports-2017-097608. https://pubmed.ncbi.nlm.nih.gov/28698222/ — associação entre proteína e ganhos com treino resistido; a dose individual continua variável.
5. **Jäger R et al. (2017)**. ISSN Position Stand: protein and exercise. *J Int Soc Sports Nutr*. DOI: 10.1186/s12970-017-0177-8. https://pubmed.ncbi.nlm.nih.gov/28642676/ — recomendações para pessoas fisicamente ativas, condicionadas ao contexto.
6. **WHO (2020)**. Guidelines on physical activity and sedentary behaviour. https://www.who.int/publications/i/item/9789240015128 — recomenda atividade aeróbia e fortalecimento, não valida cronogramas personalizados de hipertrofia.
7. **ACSM (2025–2026)**. Position statement on progression in resistance training, verificar bibliografia atualizada em https://acsm.org/ — individualização, esforço e progressão; dados do FORJA não equivalem à avaliação clínica.

## Ampliação responsável das bases de dados

Prioridade para catálogos com identidade e versionamento por fonte, tratamento culinário e unidade:
- **TBCA / USP-FoRC**: https://www.tbca.net.br/ — porções e preparações brasileiras, consultar termos de licença/redistribuição antes de empacotar.
- **TACO / NEPA-UNICAMP**: https://www.nepa.unicamp.br/taco/ — composição de alimentos brasileiros, checar versão e acesso.
- **USDA FoodData Central**: https://fdc.nal.usda.gov/ — descritores, nutrientes por 100 g, identificadores e modalidade de base; consultar política e API.
- **Rótulos enviados pelo usuário**: preservar fabricante, porção, data e grau de confirmação. Não apresentar estimativa genérica como dado de rótulo verificado.
- **Estudos/diretrizes**: registro `id / título / DOI ou URL / ano / nível de evidência / aplicabilidade / regra usada / revisão`, evitando afirmar que referências sustentam pontos quantitativos específicos sem suporte direto.

Proposta técnica de catálogo: `foodId`, `sourceId`, `sourceVersion`, `retrievedAt`, `per100g`, `portionBasis`, `processing`, `nutrientsMissing`, `verified` e `license`. Nutriente desconhecido continua `null`, nunca zero por ausência.

## Testes e critérios antes de publicar

- Testar ganho, perda, manutenção e metas vencidas; mudança de sentido e datas inconsistentes.
- Nenhuma data exige gasto impossível para atingir o peso-alvo; avisar sem ajustar kcal automaticamente.
- Treinos concluídos são contexto, sem adicionar calorias de exercício outra vez.
- Metas manuais e profissionais anteriores permanecem intactas.
- Revisar mensalmente referências e aceitar atualização científica sem sobrescrever históricos nem dados pessoais.
