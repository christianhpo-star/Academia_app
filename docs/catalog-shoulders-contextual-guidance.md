# FORJA — Ombro/trapézio, recomendações no catálogo e ajuste de sessão

Data: 23/11/2026. Objetivo: adicionar navegação por músculos independente dos blocos A/B, novas opções de movimento, recomendação contextual por lacunas de séries diretas, orientação **pontual** de séries e repetições sem alterar fichas ou históricos.

## O que a interface faz

- Filtro de descoberta **Ombro e trapézio**. É uma categoria de exploração, não uma ficha E nem um novo esquema A/B/C/D. Reúne ombro anterior, lateral, posterior, trapézio superior e médio a partir da anatomia dos exercícios existentes e novos.
- Dez opções novas **inativas por padrão**: encolhimento de ombros com halteres, barra e Smith; face pull alto; elevação em Y no banco; crucifixo inverso no banco; elevação lateral na máquina; elevação frontal na polia; desenvolvimento com barra; remada alta na polia com corda. IDs próprios, anatomia frente/costas, descrição técnica curta e classificação de estímulo.
- Selo **Recomendado** só quando a avaliação do histórico registrado é confiável: >=3 sessões nos últimos 30 dias e >=80% de séries com mapeamento anatômico. Um músculo com pouca série **direta** registrada aparece como oportunidade, mas isso não comprova falta absoluta de estímulo; séries **auxiliares** são acompanhadas em separado. Também calcula o total ponderado (séries diretas + 0,5 × auxiliares) e não apresenta o selo se o volume da região for igual ou superior à mediana positiva dos outros grupos no próprio período, evitando recomendar deltoide anterior só porque supinos o estimulam indiretamente. A comparação é relativa ao histórico, não um limiar clínico de suficiência. Máximo de três badges por região nas sugestões iniciais, para não marcar a biblioteca inteira.
- Ao abrir detalhes do exercício recomendado, mostrar qual região motivou a indicação, série direta dos últimos 30 dias, e um ajuste **para hoje** de 2–3 séries com faixa de repetições da variação e RIR 2–3 apenas como referência subjetiva opcional, sem garantir resultado superior. Se há dados insuficientes, não inventar badge nem alerta.
- **Trocar só hoje**: gera um novo rascunho confirmado via serviço `catalog-session.js`, carrega metas da sessão nos metadados `dayPrescription`, limita a 2–3 séries, mantém a faixa de repetições do exercício e não altera `state.exercises` da ficha permanente. Os novos exercícios cadastrados para rascunho ficam inativos. Sessões já realizadas não podem ser retiradas. Sem confirmação, nenhum ajuste acontece.

## Regras conservadoras

- **Sem "compensação" de volume perdido:** 21 dias sem registro direto é alerta informativo do Forja, não evidência de destreinamento nem motivo para criar 10 séries de uma vez.
- Doses iniciais de 2 séries para movimento novo, podendo chegar a 3 séries **apenas** quando região não tem série direta nos últimos 30 dias, não foi exercitada na sessão atual e não há sinal de fadiga, Muay Thai hoje/ontem ou desconforto registrado.
- RIR 2–3 é ponto de partida para registrar esforço, **não** recomendação cientificamente exata; a literatura ainda não fundamenta um alvo preciso de RIR para todos.
- Séries de músculos secundários não contam como séries diretas completas. Não equiparar indiscriminadamente supino, elevação lateral e encolhimentos de trapézio.
- O mecanismo acompanha somente os treinos locais salvos no PWA. Ele não tem acesso remoto ao histórico pessoal do usuário e não pode inferir sessões que não foram registradas.
- Se um exercício está sem cobertura anatômica, não o sinalizar como recomendado por associação superficial de texto.

## Fontes científicas revisadas

1. Currier et al. (2026), `Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews`. ACSM. DOI: 10.1249/MSS.0000000000003897, https://pubmed.ncbi.nlm.nih.gov/41843416/. Revisão de 137 revisões e >30 mil participantes: força, tamanho e capacidade funcional melhoram com treino de resistência; maior volume favorece hipertrofia, mas não há evidências suficientes para afirmar superioridade sistemática da variação de exercício ou prescrever RIR exato.
2. Pelland et al. (2026), `The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains`. Sports Medicine 56:481–505. DOI 10.1007/s40279-025-02344-w, https://pubmed.ncbi.nlm.nih.gov/41343037/. Meta-regressão de 67 estudos: relações de dose-resposta com retornos decrescentes; quantificar séries diretas/indiretas de forma fracionária parece captar melhor a realidade do que somar todo estímulo acessório integralmente.
3. ACSM (2026), `ACSM Publishes Updated Resistance Training Guidelines`, https://acsm.org/resistance-training-guidelines-update-2026/. Importância da regularidade e da individualização de programas.

Os valores numéricos usados pelo software são **heurísticas conservadoras de UX**, não um algoritmo clínico validado; a publicação das diretrizes não endossa os limiares específicos do Forja.

## Segurança e qualidade

- Nunca autoativar ou reescrever ficha salva; nunca apagar repetições executadas.
- Não salvar recomendações ao navegar, nem transitar dados do usuário para servidor externo.
- Testes unitários de dez IDs anatômicos, badges, ausência de dados e RIR, proteção do rascunho e composição de séries.
- Smoke browser Android 320/390/412 px, filtro de músculos, badges somente com histórico sintético suficiente, detalhe sem gravação e CI completa.
