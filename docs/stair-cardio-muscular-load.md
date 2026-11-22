# Escada: ritmo médio e solicitação muscular complementar

## Decisão científica e de produto

A escada mecânica (stairmill/stepper) exige trabalho repetido dos extensores do quadril, joelho e tornozelo, e pode causar fadiga muscular local. Sua contribuição é **atividade aeróbica e resistência muscular complementar**, não um conjunto de séries de musculação intercambiáveis. Estudos com EMG descrevem ativação e demandas biomecânicas, mas ativação aguda ou fadiga não determinam o número de séries para hipertrofia. A intensidade, apoio de mãos, altura do degrau, técnica e tipo de máquina alteram a demanda; não há coeficiente validado para converter minutos ou níveis de escada em séries equivalentes.

O mapa conserva as cores/contagens exclusivamente para séries de força. Quando uma sessão salva contém escada, marca por **contorno âmbar tracejado** quadríceps, glúteo máximo e panturrilhas, sem alterar nível, cor, totais ou recomendações. Posteriores da coxa são citados como participação secundária e variável no detalhe, sem contorno principal. O mapa soma minutos e dias por janela (7, 30, 90) e indica o último ritmo informado. A legenda deixa claro que o contorno significa solicitação provável, não hipertrofia ou sobrecarga medida.

Esse é um indicador de **exposição**, não uma estimativa quantitativa de estímulo hipertrófico. Nenhuma soma de minutos entra no algoritmo de força, dose, recomendação de aumentar carga, calorias, recuperação ou lesão. Atividade somente em rascunho não aparece no mapa. Registros salvos fora da janela e datas futuras são ignorados. Registros duplicados com mesmo ID são contados uma vez.

## Campos opcionais do cardio

Na modalidade **Escada**, além do tempo (min), aparece **Ritmo médio (opcional)** com unidade explícita:

- **Degraus/min**: cadência média informada no equipamento, armazenada como `avgSpeed` e `speedUnit: "steps_min"`. Aceita >0 e até 240.
- **Nível da máquina**: valor apresentado pelo equipamento, armazenado com `speedUnit: "machine_level"`. Aceita >0 e até 99. Não é convertido em degraus/min, velocidade horizontal ou carga física comparável.

O campo permanece opcional. Se houver um ritmo informado, é necessário haver tempo realizado na escada. Outros tipos de cardio mantêm somente tipo e minutos. É possível alternar a unidade e consultar o resultado no resumo antes de salvar e no histórico. O formulário usa `inputmode=decimal` e `step=any`, em ambas as unidades, e explica a diferença entre nível e cadência.

Contrato salvo do registro:

```json
{"type":"escada","minutes":10,"avgSpeed":56,"speedUnit":"steps_min"}
```

Registros legados como `{"type":"escada","minutes":10}` permanecem válidos e não ganham valor estimado. Valores extras, inválidos ou de outros equipamentos não são copiados para registros de outra modalidade. A carga não é estimada a partir da cadência nem da percepção de esforço.

## Músculos e interpretação

- Quadríceps: suporte e extensão do joelho, participação na fase de apoio.
- Glúteo máximo: extensão de quadril/propulsão, especialmente importante ao aumentar velocidade.
- Panturrilhas: suporte e impulsão no tornozelo, sensíveis à técnica e contato com degrau.
- Posteriores da coxa: participação acessória/variável, sem quantificação automática.

Estudos sobre escadas reais e stairmill mostram diferenças entre dispositivos e padrões de movimento. A cor dos grupos musculares continua baseada no histórico de séries de força; contorno âmbar é uma camada separada. **Sem contorno** não prova ausência de trabalho, e **contorno** não indica a quantidade ideal nem dispensa treino resistido específico.

## Fontes

- Lewis et al. (2015), *Changes in lower extremity peak angles, moments and muscle activations during stair climbing at different speeds*, Journal of Electromyography and Kinesiology. DOI [10.1016/j.jelekin.2015.07.011](https://doi.org/10.1016/j.jelekin.2015.07.011) — 30 adultos, velocidades diferentes; maior demanda do quadril com velocidade, sem aumento uniforme do joelho.
- Chang et al. (2020), *Biomechanical differences during ascent on regular stairs and on a stairmill*, Journal of Biomechanics. DOI [10.1016/j.jbiomech.2020.109758](https://doi.org/10.1016/j.jbiomech.2020.109758) — diferenças entre escada real e stairmill (12 participantes).
- *Oxygen uptake and muscle activity limitations during stepping on a stair machine at three different climbing speeds* (2018), Ergonomics. DOI [10.1080/00140139.2018.1473644](https://doi.org/10.1080/00140139.2018.1473644) — 25 adultos, atividade eletromiográfica e fadiga muscular local em diferentes intensidades.
- Van Roie, van Uffelen & Delecluse (2025), *Stair-Climbing Versus Machine-Based Resistance Exercise to Improve Muscle Power Among Older Adults: A Noninferiority Trial*, Journal of Strength and Conditioning Research. [PMID 39590559](https://pubmed.ncbi.nlm.nih.gov/39590559/) — intervenção supervisionada em idosos: melhoras de potência e função, sem demonstrar equivalência universal com musculação ou hipertrofia. Não extrapolado como regra para o stairmill.

## QA

- Testar duração vazia, ritmo vazio, unidade inválida, valores fora dos intervalos e rascunho salvo.
- Testar 7/30/90 dias, deduplicação, histórico sem escada, disponibilidade de contorno em Frente/Costas, ausência de alteração nos totais de séries e backup/importação.
- Testar visualização em larguras 320, 390 e 412 px.
- Sem teste físico com o Samsung do usuário; validação de navegador com dados sintéticos.
