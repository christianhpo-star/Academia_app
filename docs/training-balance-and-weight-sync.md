# Balanceamento muscular, catálogo complementar e pesagem única — FORJA

## Situação e interpretação

Referência visual do usuário em 22/11/2026: mapa corporal dos últimos 30 dias indica várias regiões com menor volume relativo; abdômen e oblíquos sem volume estimado direto, panturrilhas com menor volume. O mapa **não mede atividade clínica nem hipertrofia**. Lombar hachurada é explicitamente *não estimada*, e não se pode afirmar que esteve sem trabalho. O app não pode inspecionar o histórico privado de 14 treinos sem importação dos dados reais da instalação; validação usa apenas amostras sintéticas.

## Catálogo

Dez exercícios opcionais e não ativados por padrão: abdominal bicicleta, elevação de joelhos suspenso, flexão lateral na polia, dead bug, woodchop diagonal na polia, panturrilha Smith, panturrilha sentada na máquina, agachamento sumô com halter, passada lateral com halter e extensão de quadril em banco 45°. Cada um possui ID estável, imagem anatômica via família existente ou nova, tipo de carga, repetições e mapeamento de volume. Não alterar ficha já salva; no catálogo os novos entram desativados. Movimentos combinados são oferecidos sem serem convertidos em séries equivalentes entre músculos distintos.

## Regras de avaliação

O motor `training-balance.js` lê somente séries efetivas registradas nos últimos 7 e 30 dias, com a última sessão direta em 90 dias. Requer ao menos 3 sessões classificáveis e >=80% de cobertura de mapeamento; caso contrário, não apresenta alertas de falta de treino. Exposição direta e auxiliar são separadas; uma região sem séries diretas pode ter contribuição indireta. O corte de **21 dias** é um alerta de produto sobre ausência de registro direto, não prazo clínico para perda de massa muscular. Registros fora do app não são observáveis.

A sugestão de substituição durante o treino requer: (1) alvo com baixo registro direto; (2) alternativa disponível no catálogo; (3) exercício de origem ainda sem repetições executadas; (4) pelo menos dois movimentos do grupo de origem planejados na sessão, com volume direto de origem relativamente alto nos períodos; (5) sem bloqueio por fadiga elevada ou Muay Thai recente. A presença de dor no joelho desautoriza recomendação automática de troca por exercícios de pernas. Nada é substituído sem confirmação explícita.

`Trocar só hoje`: reaproveita o serviço `catalog-session.js` com validação e preservação de dados; o substituído fica no campo de retirados daquela sessão, sem mudar a ficha padrão. Se o exercício novo ainda não estiver na biblioteca pessoal, adicioná-lo como **inativo**, preservando-o para leitura dos rascunhos e próximos backups. A troca deve resistir a reabertura do PWA; séries com repetições já registradas não podem ser apagadas. Descartar alertas não impede prosseguir com a ficha.

Quando não há candidato seguro para uma troca, mostrar regiões e link para incluir manualmente só hoje pelo catálogo, sem recomendação de troca automática.

## Pesagem — fonte única

`state.weights` é a fonte de peso atual. A mais recente pesagem não futura alimenta evolução, planejamento de metas e, se existir, o perfil nutricional de cálculo. `settings.startWeight` permanece referência histórica; `settings.targetWeight` permanece peso-alvo escolhido. Pesagem não redefine meta calórica profissional/manual (2.170 kcal da configuração do usuário) e **não cria prescrição calórica**. Não usar pesagens de dias futuros ou datas inválidas; caso salvar falhe, restaurar os dados anteriores.

## Fundamentação e limites

- American College of Sports Medicine (2026), *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews*, DOI 10.1249/MSS.0000000000003897. Indica trabalho sistemático dos principais grupos musculares, progressão e adaptação ao indivíduo. Frequência semanal e consistência são preferíveis a determinismos para uma sessão.
- Pelland et al., revisão/meta-regressão sobre dose-resposta de volume e frequência de musculação (2026), DOI 10.1007/s40279-025-02344-w. Distingue séries diretas e indiretas; pesos descritivos aproximados não são medidas exatas de estímulo.
- A escolha automatizada de substituição é uma **heurística conservadora de UX**, não um protocolo clínico testado ou equivalência comprovada de resultados entre dois exercícios.
- A quantidade de séries registradas não prova recuperação completa, lesão, resultado hipertrófico, eficácia nem que o usuário negligenciou deliberadamente músculos.

## QA

- Testes Node: catálogo novo com mapa anatômico e classificação, cobertura insuficiente sem falso alerta, lacunas e última atividade >21 dias, risco por fadiga/dor/Muay Thai, ausência de alteração no rascunho original.
- Playwright: painel de treino e evolução, troca com confirmação, rascunho persistido, sem séries apagadas nem alteração de exercícios ativos, visibilidade 320/390/412 px; uma pesagem atualiza as telas sem mudar histórico inicial/meta/targets nutricionais.
- **Sem QA físico Samsung**: testar no aparelho após deploy; não afirmar que dados reais de treino foram auditados remotamente.
