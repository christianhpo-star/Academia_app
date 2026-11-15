# FORJA

## FORJA MOVE v3 — anatomia esquemática e trajetórias

- Homologação de layout: 320, 390 e 768 px no Chromium; modo de movimento reduzido usa poses estáticas empilhadas até 420px para manter legibilidade. Controles Início, Fim e Pausar/Retomar ocupam a largura do painel no mobile; borda do visualizador utiliza #5D758A para contraste. QA em aparelho Android real ainda necessária.


- Ilustração vetorial em tela cheia/modo ampliado, com conexão cabeça-pescoço, ombros, tronco e pelve, além de marcações de articulações envolvidas e trilha pontilhada ciano que representa a direção principal do movimento.
- O modal dispõe de **Início**, **Fim**, **Pausar/Retomar** com controles reais do relógio SVG (SMIL nativo); selecionar uma posição pausa o movimento no instante correspondente.
- Na preferência **Reduzir animações**, dois quadros estáticos de início/fim substituem a animação — sem elementos `<animate>` no modal. Miniaturas do catálogo continuam estáticas e leves.
- Os 51 IDs e as 18 variantes da v2 são preservados; sem alterações no histórico ou na gravação dos dados. Recursos animados permanecem locais para o uso offline.
- As trajetórias são curvas esquemáticas de identificação do padrão motor, não análise biomecânica ou prescrição técnica individual. Ao interpretar variações, confira posição do aparelho e a orientação profissional.


## FORJA MOVE v2 — identificação de variações

- Os 51 IDs do catálogo continuam associados a 19 famílias, com **18 variantes de geometria, equipamento, direção ou etiqueta**.
- Banco inclinado/declinado, supino com barra ou em máquina, mesa e cadeira flexora, adutora/abdutora, panturrilha sentada/no leg press, hack, búlgaro, step-up, puxadas fechada/neutra e pullover na polia possuem apresentações próprias.
- As miniaturas permanecem estáticas; no visualizador os movimentos têm interpolação suave em 2,8 segundos, controles de pausa e respeito a `prefers-reduced-motion`. O cache offline foi atualizado.
- O item ambíguo **Mesa ou cadeira flexora** indica explicitamente que o desenho representa somente a versão sentada. Nada aqui altera as séries, o histórico nem o backup do usuário.
- Ilustrações esquemáticas para identificação de equipamento/padrão, não prescrição técnica ou amplitude de movimento. Conferir detalhes com instrutor presencial.
- Bases de diferenciação: [NASM — lying leg curl](https://www.nasm.org/resource-center/exercise-library/lying-leg-curl), [NSCA — leg curl and adduction](https://www.nsca.com/education/articles/ptq/are-the-seated-leg-extension-leg-curl-and-adduction-machine-exercises-non-functional-or-risky/), [EGYM — machine guide](https://storage.googleapis.com/egym-b2b-website/downloads/operation_manual_for_egym_strength_machines_EN.pdf).


## FORJA MOVE — biblioteca de movimentos ilustrativos

- Catálogo, fichas e sessão de musculação oferecem **Ver movimento**, sem alterar registros.
- `exercise-motion.js` apresenta 19 famílias vetoriais; 51 IDs de exercícios do catálogo estão mapeados. Miniaturas são estáticas e o modal oferece animação SVG local com pausar/retomar.
- Com `prefers-reduced-motion`, o modal mostra imagem estática. O recurso não utiliza serviços externos, localização ou armazenamento.
- Variações de exercício compartilham ilustrações de padrões gerais. O visual **não corresponde à execução técnica exata** de inclinações, máquinas e pegadas. A posição do equipamento deve ser conferida presencialmente.
- Validação: `node --test tests/exercise-motion.test.cjs` e testes de interface existentes.


## FORJA UX16 — revisão de dados sem cobrança

- Um aviso opcional na Início, após o próximo treino; sugestões adicionais recolhidas por padrão.
- Acompanhe mudanças importantes de peso e divergências de perfil sem interpretar uma leitura isolada como mudança de gordura.
- Revisões de circunferências, bioimpedância, atividade e metas são sugestões, não tarefas obrigatórias.
- **Conferir / Lembrar em 14 dias / Dispensar**; em Ajustes é possível desligar todos os lembretes. Preferências ficam no aparelho, nos backups e exportação para IA.
- Periodicidades e limiares numéricos são heurísticas explícitas do FORJA, não pontos de corte clínicos.
- [Matriz científica e critérios de implementação](docs/reminder-rules-ux16.md).

## FORJA UX15 — objetivos e auditoria científica

- Em **Ajustes → Objetivo e prazo**, escolha entre peso-alvo por data, recomposição, redução de gordura, ganho de massa ou manutenção.
- Em **Evolução → Plano por objetivo**, confira ritmo matemático exigido, faixas de energia de partida e opções de treino e alimentação. **Nenhuma sugestão altera automaticamente sua ficha ou suas metas nutricionais.**
- O algoritmo não prevê o peso em uma data nem calcula as calorias necessárias para cumprir o prazo; essas possibilidades exigem modelos dinâmicos e calibração longitudinal.
- [Auditoria documental e científica](docs/evidence-audit-goals-ux15.md) · [Registro estruturado de evidências e heurísticas](docs/evidence-register.json).
- Referências genéricas de alimentos não são declaradas como valores TBCA/TACO/USDA sem verificação por item.

## FORJA UX13 — histórico de atividade e recomendações

- **Alimentação > Minhas metas**: após salvar um perfil completo, uma prévia com energia e macronutrientes é apresentada; os valores só se tornam metas quando o usuário aceita. Ajustes manuais e profissionais são preservados.
- **Passos do Samsung Health**: entrada manual por dia no mesmo formulário de metas, com atalho próximo ao fator de atividade; médias dos dias registrados em 7/14/28 dias e indicação de cobertura. A ausência de passos não é zero e treinos não adicionam calorias à fórmula.
- **Fator de atividade**: faixa heurística sugerida somente depois de dados distribuídos por pelo menos 7 dias, com a frequência de musculação e Muay Thai como contexto. A proposta apenas altera a prévia: é necessário selecionar, salvar o perfil e aceitar as metas. Não é PAL medido.
- **Evolução > Medidas corporais**: leituras opcionais de bioimpedância do Galaxy Watch informadas manualmente e armazenadas por data; não são diagnósticos e não mudam automaticamente as metas.
- **Ajustes > Seus dados**: exportação de todo o histórico para análise por IA em um JSON gerado localmente, além do backup de restauração. O arquivo pode conter dados sensíveis e não deve ser publicado no repositório. A exportação para IA **não é** arquivo de restauração.
- **Sem sincronização automática** com Samsung Health. [Contrato, algoritmo e limites](docs/activity-factor.md).

## Diário alimentar e metas (issue #17)

Alimentação tem acesso direto na navegação, com seletor de data, gráficos circulares, cinco refeições (incluindo ceia), favoritos e editor composto com rascunho local. Em **Minhas metas**, informe altura, idade, peso, atividade e objetivo; aceite uma sugestão explicada ou mantenha metas manuais/profissionais. Catálogo de exercícios permanece em Treinos.

As sugestões são estimativas iniciais, não gasto medido; não somam calorias de treino automaticamente e não sobrescrevem metas manuais. Fibras desconhecidas permanecem desconhecidas; estimativas de açaí continuam separadas dos totais. Perfil, metas e rascunho entram no backup privado. [Contrato, evidências e limites](docs/nutrition-goals.md).

As seções abaixo descrevem etapas anteriores; quando divergirem sobre acesso ou metas, prevalece a descrição acima.



## Açaís Doce Cascão — referência estimada

- Foram incluídos **Açaí trufado Branco 500 ml** e **Açaí trufado Preto 500 ml**, além dos adicionais opcionais de creme Ninho e creme de avelã. Os itens têm estimativas de baixa confiança, nunca rótulos oficiais.
- **Branco:** ≈814 kcal, faixa ilustrativa 615–1041 kcal; P ≈10 g, C ≈133 g, G ≈27 g por copo. **Preto:** ≈1003 kcal, faixa ilustrativa 741–1292 kcal; P ≈9 g, C ≈134 g, G ≈47 g.
- Meio copo usa proporcionalidade com a ressalva das camadas desiguais. Uma porção adicional só é registrada se selecionada pelo usuário.
- O histórico armazena o cálculo e a incerteza junto à entrada; o painel mostra estimativas separadamente dos valores nutricionais com fonte, sem sugerir compensação por treino ou atribuir consumo automaticamente ao usuário ou sua esposa.
- Metodologia, ingredientes simulados e limites: [docs/acai-estimates.md](docs/acai-estimates.md).

## Catálogo alimentar rápido (etapa 3, validação pendente)

O módulo de alimentação permite buscar alimentos sem rede, escolher porções, registrar produtos embalados, e salvar refeições registradas como favoritas. As fotos fornecidas pelo usuário permitiram identificar atalhos de exemplo para Itambé morango zero lactose (200 g, 52 kcal, 6 g de proteína, 7 g de carboidratos e 0 g de gordura) e Piracanjuba PRO FORCE Banoffee (250 ml, 170 kcal, 23 g de proteína, 17 g de carboidratos e 1 g de gordura). Os dados de 250 ml são calculados por embalagem, sem converter volume para gramas. A foto não contém garantia de equivalência a embalagens futuras; conferir sempre o rótulo. Whey Growth sem sabor/linha especificados permanece sem estimativa. Não há registro automático de consumo.

As referências genéricas (arroz, feijão, frango, ovo, banana, aveia e leite) usam estimativas ilustrativas, não números de uma ficha FDC individual verificada. As porções em colheres/conchas são aproximações e podem diferir da realidade. Dados incompletos não são convertidos em zero e o acompanhamento não prescreve metas individuais de energia ou macronutrientes.

## Alimentação (PR de interface, em validação)

- Diário alimentar manual, offline, com data, tipo de refeição, descrição, porção, repetição e edição ou exclusão. A entrada de informações do rótulo por 100 g é opcional, e nenhum valor nutricional é inventado quando faltam dados.
- Acesso secundário pelo Início ou Evolução, sem nova aba de navegação e sem alterar o treino principal. Refeições não ficam no GitHub: permanecem no navegador e são incluídas no backup privado.
- Totais são apenas de itens observados com dados completos; um traço representa valor desconhecido, não zero nem consumo diário total.
- Não prescreve metas calóricas/proteicas, não estima gasto de treino e não usa serviços externos.

 — Academia_app

Aplicativo web **mobile-first**, instalável como PWA, para registrar treino de força, acompanhar a evolução das cargas e sugerir quando **manter, repetir ou aumentar** com cautela. Feito sob medida para uma rotina com musculação 5–6 vezes por semana, Muay Thai às segundas, quartas e sextas e meta inicial de 88,3 para 82 kg até 14/01/2027.

## Muay Thai — diário complementar (branch em revisão)

- Registro independente de aulas na academia, treinos em casa e outros locais, inclusive nos dias sem musculação.
- Lista de exercícios realizados (polichinelos, agachamentos com salto, afundos, sombra, manoplas etc.), com séries e quantidades opcionais. Nenhum exercício é presumido como concluído.
- Duração total, esforço percebido, fadiga, desconforto no joelho e observações opcionais.
- Rascunho salvo automaticamente, histórico separado dentro da aba Histórico, edição e exclusão confirmada.
- Backup JSON inclui o diário e seu rascunho, preservando a importação de backups anteriores.
- Muay Thai não conclui blocos A/B/C/D, não entra automaticamente no radar de força e não autoriza progressão de carga.
- Dados continuam locais; ainda não há sincronização entre dispositivos.

## Calendário mensal de treinos (branch em revisão)

- Calendário na aba Histórico com navegação mês a mês, usando exclusivamente as datas das sessões concluídas e salvas.
- Indicadores visuais separados para musculação e Muay Thai, inclusive ambos no mesmo dia.
- Resumo do mês: dias ativos distintos, sessões de musculação e sessões de Muay Thai.
- Seleção de qualquer dia para consultar as sessões e exercícios realizados, com suporte a teclado e telas pequenas.
- Dias sem registro não são marcados como descanso e rascunhos não são contados.
- Calendário derivado do histórico existente, sem persistência adicional ou migração de registros.

## Sessão flexível e constância — experiência em revisão

- Durante o treino, é possível retirar um exercício **somente hoje**, restaurá-lo, registrar um motivo opcional e adicionar movimentos existentes ou do catálogo offline; a ficha original permanece inalterada.
- O catálogo inicial possui 21 movimentos adicionais com IDs estáveis, equipamento e região muscular. A seleção pela busca é local; qualquer exercício integrado ao histórico mantém seu identificador.
- Exercícios com repetições já lançadas não podem ser retirados diretamente, evitando apagar séries efetivamente realizadas sem confirmação.
- O histórico salva quais exercícios estavam previstos (`plannedIds`) e quais foram explicitamente retirados (`skipped`), sem inventar omissões em registros antigos.
- O painel analisa últimos 7, 14 e 28 dias e destaca **mudanças de ritmo ou omissões explicitamente frequentes**. Nenhum dia sem registro é tratado como falta ou descanso obrigatório.
- As mensagens sugerem sessões mais simples, redistribuição de movimentos ou alternativas; nunca aumentam carga/volume automaticamente.
- Regras do produto são hipóteses operacionais conservadoras, não limiares científicos individualmente validados; dias de Muay Thai são contabilizados sem converter rounds em séries de força.

## Volume por músculo e recomendações conservadoras — PR #3 (em revisão)

- Novo motor `dose.js` calcula séries efetivas concluídas por grupo muscular nos últimos 7 e 28 dias; séries de aquecimento, cargas de exemplo e exercícios não realizados não entram na conta.
- O mapeamento de exercícios distingue musculatura primária (1 unidade por série) e envolvimento auxiliar (0,5 unidade estimada), como convenção de pesquisa, **não equivalência fisiológica exata**. Exercícios personalizados sem classificação são sinalizados e não geram números inventados.
- A aba **Evolução** mostra volume semanal observado e média simples dos 28 dias; a tela de **treino em andamento** atualiza a visão conforme as séries são realmente registradas.
- Considerar **uma série extra opcional** é uma hipótese condicionada: energia explicitamente sobrando (`leve`), ao menos duas sessões anteriores comparáveis, RIR informado ≥2, desempenho estável, volume atual próximo do próprio histórico e ausência de fatores de cautela relevantes. Nenhuma série ou carga é acrescentada automaticamente.
- Em caso de dados insuficientes, fadiga alta, dor pertinente ou Muay Thai recente, o painel deve indicar manutenção/recuperação em vez de sugerir aumento. Essas regras são **heurísticas de produto a validar**, não limiares cientificamente determinados para o usuário.
- Não usar o peso isolado para afirmar recomposição corporal. A literatura embasa princípios gerais, mas o motor não mede hipertrofia nem estima causalmente os efeitos de uma série adicional.

Fontes de projeto: ACSM 2026 DOI `10.1249/MSS.0000000000003897`; Pelland e colaboradores 2026 DOI `10.1007/s40279-025-02344-w`; Robinson e colaboradores 2024 PMID `38970765`.

## Recomendações contextuais no catálogo (PR em revisão)

Ao abrir **Adicionar exercício**, a sessão apresenta primeiro até três alternativas justificadas pela ficha em andamento, exercícios retirados e registros disponíveis. O catálogo completo permanece acessível em **Explorar todos os exercícios**, com busca por nome e equipamento.

As sugestões utilizam o mapeamento de grupos musculares de `dose.js`, o histórico concluído e o volume descritivo em 7 dias; não simulam eficácia individual nem geram prescrições clínicas. A ordem das sugestões é uma heurística explícita do FORJA, **não** uma classificação científica de exercícios.

- Priorizar substituição de movimento retirado explicitamente, ou variação de movimento já previsto, evitando recomendar inclusão de volume arbitrariamente.
- Evitar recomendações de exercícios para grupos musculares de membros inferiores diante de dor atual informada no joelho. Exibir cautela com fadiga alta ou Muay Thai recente. A aplicação não pode inferir ausência de dor por falta de registro.
- Nenhuma sugestão altera a ficha, cria histórico, substitui automaticamente exercícios ou conta séries como feitas. Apenas o toque no botão adiciona uma linha à sessão.
- Sem amostra histórica, declarar limitação em vez de inventar uma evolução. Exercícios sem classificação ficam disponíveis no catálogo completo, mas não recebem pontuação pseudocientífica.
- Testes unitários e browser cobrem ordenação e filtros, persistência, responsividade, cenário sem dados e advertências de recuperação.

## Modo focado e preparo rápido de séries (PR em revisão)

> Integração preparada com a correção de atualização do cache do PR #5: arquivos JavaScript/CSS versionados, `focus.js` incluído no cache offline e recuperação do histórico local sem alteração de chaves. Validar cache e fluxos juntos antes da publicação.



- Na tela de sessão de musculação, botão **Ativar modo focado** exibe um único exercício por vez, com navegação Anterior/Próximo e lista compacta para pular diretamente para qualquer exercício.
- O modo completo continua padrão e pode ser recuperado com **Ver ficha completa**, mantendo a ordem e o rascunho.
- Indicadores mostram exercícios com todas as séries efetivas registradas e total de séries efetivas preenchidas (aquecimentos não entram na contagem).
- Ações de preparo **Repetir cargas da última sessão** e **Repetir carga da série anterior** preenchem apenas cargas **em branco**, sem apagar dados já digitados, e **não** copiam repetições nem RIR. A execução precisa ser confirmada por seu próprio registro de repetições.
- A interface de foco não muda o histórico, não altera a ordem da fila A/C/B/D e não transfere dados entre dispositivos.
- O salvamento automático continua no mesmo armazenamento local. Caso o navegador reinicie, o treino é recuperado na visualização completa para máxima compatibilidade.
- Testes incluídos para 320/390/768 px, alternância entre modos, cópia segura, rascunho e ausência de sessões fictícias.

## Funcionalidades da versão 1.3

- Histórico real por exercício, com carga (kg ou kg/halter), repetições e RIR (repetições em reserva) **por série**.
- Separa séries de **aquecimento** das séries efetivas; inclui o **supino com halteres** como exemplo editável: aquecimento 20 kg, depois 22,5 / 25 / 25 kg por halter. **Não apresenta essas cargas como treino concluído**.
- Sugestão explicável de progressão: exige **duas sessões consecutivas** atingindo a meta antes de recomendar aumento. No modo pirâmide compara a série efetiva mais pesada; com carga estável avalia as séries efetivas.
- Regra conservadora para o **joelho**: sem aumento automático caso haja dor no exercício, dor no dia seguinte ou ausência dessas informações. Uso de joelheira não é considerado liberação de carga.
- Divisão flexível de blocos **A (costas/bíceps), C (quadríceps), B (peito/tríceps), D (posteriores/glúteos)**. A fila considera cada bloco pendente até a sessão ser **salva**; escolher outra ordem não marca os treinos pulados como concluídos. Repetir um bloco já feito na rodada não remove os outros. Com fadiga alta ou dor no joelho, se não houver superiores pendentes, recomenda **recuperação**, sem apagar pernas da fila.
- **Comparação série a série** na tela do treino: mostra a carga, as repetições, o tipo de série (aquecimento ou efetiva) e o RIR da sessão anterior. Destaca melhora de repetições com a mesma carga e aumento de carga com desempenho mantido.
- **Salvamento automático de rascunho** no armazenamento local do aparelho: escreve após cada edição de carga, repetições, RIR, observações, dor, adição/remoção ou alteração do tipo de série. Se a página for atualizada ou o navegador encerrar, a sessão em andamento é recuperada. Navegar entre telas não a descarta; só o botão Cancelar, com confirmação, elimina o rascunho.
- Edição de exercícios, séries, metas de repetições, incremento de carga, unidade e método de progressão; ativação/desativação de variações.
- **Mapa de força interativo na aba Evolução**: radar de índices relativos por grupo muscular na janela de 90 dias, com cada exercício comparado ao próprio primeiro registro da janela (100%). Grupos sem base suficiente não são apresentados como evolução.
- **Detalhamento ao tocar em um grupo do radar**: lista exercícios do bloco, permite selecionar cada movimento e mostra gráfico de força estimada por sessão, datas, série efetiva usada no cálculo e comparação percentual. Também oferece acesso textual aos registros e estados vazios sem criar resultados fictícios.
- A força estimada usa a fórmula de Epley sobre a melhor série efetiva de cada sessão (até 30 repetições). **Não equivale a 1RM medido**, nem indica autorização para aumentar a carga. A comparação pode variar com máquina, amplitude, técnica e fadiga.
- Peso corporal e gráfico de tendência rumo à data-alvo.
- **Local-first**: histórico e rascunho armazenados via `localStorage` no navegador, sem servidor ou conta; exportação/importação JSON do histórico e exportação de séries CSV. O backup JSON atual **não inclui** o rascunho não finalizado.
- **PWA offline** após primeiro acesso HTTPS (incluindo GitHub Pages).

## Executar

Não há dependências, bibliotecas de terceiros, login ou banco de dados.

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000/`. Para testes do motor de sugestão:

```bash
node --test tests/engine.test.cjs
python3 tests/check_assets.py

# Opcional: teste automatizado de interface (Playwright + Chromium)
python3 tests/smoke_persistence.py
python3 tests/smoke_strength.py
```

## Publicação no GitHub Pages

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, selecione `main`, pasta `/ (root)` e salve.
3. Acesse `https://christianhpo-star.github.io/Academia_app/` após a publicação.
4. No celular, abra o endereço em HTTPS e escolha **Adicionar à tela de início** / **Instalar app**, se oferecido pelo navegador.

> Se esta versão estiver numa branch ou pull request, primeiro integre-a à `main` antes de selecionar `main` no Pages. O app não está publicado automaticamente só por salvar o código.

## Segurança e privacidade

Este é um **diário de treino com regras auxiliares**, não prescrição médica, fisioterapêutica ou avaliação da segurança da articulação. Dor localizada abaixo da patela deve ser examinada se recorrente; não progrida agressivamente no leg press só porque uma joelheira compressiva reduziu a dor. Se houver dor forte, travamento, instabilidade ou inchaço, suspenda o exercício provocador e procure atendimento.

Não inclua dados pessoais sensíveis no código-fonte ou em issues públicos. O repositório contém apenas um exemplo de rotina; registros pessoais de treinos **não vão para o GitHub**. Os dados ficam somente neste navegador/aparelho. O salvamento automático não sincroniza dados entre celulares, não equivale a backup externo e pode ser perdido se limpar dados do site, usar modo anônimo ou se o navegador esgotar a capacidade de armazenamento. Se apagar os dados do navegador ou trocar de aparelho, será necessário restaurar um backup do histórico concluído. A exportação JSON contém dados de treino e peso; armazene-o com cuidado.

## Melhorias previstas

- Filtro configurável de períodos e visualização de recordes pessoais por exercício.
- Cronômetro de descanso opcional.
- Sincronização privada opcional entre dispositivos, com autenticação e consentimento.
- Opção para períodos de deload e marcação de semanas com Muay Thai mais intenso.

### Referências iniciais de carga (não são histórico real)

Cargas aproximadas informadas para o bloco B, sem repetições nem RIR:

- Supino reto com halteres: 20 (aquecimento), 22,5, 25, 25 kg por halter (quarta série provisória).
- Supino inclinado com halteres: 20, 22,5, 22,5, 22,5 kg por halter; tipo de série não presumido.
- Voador (peck deck): 55 kg nas quatro séries.
- Tríceps testa **na polia**: 50, 55, 60, 60 kg.

As referências são mostradas apenas ao iniciar o exercício **sem histórico anterior**, com campos de repetições e RIR em branco. O histórico real existente tem prioridade. Dados salvos em navegadores que já usavam o FORJA recebem a migração conservadora das configurações ainda originais sem criar sessões ou substituir exercícios personalizados. Os demais exercícios permanecem para preenchimento na academia.

## Recomendações de substituição e energia extra
- O catálogo distingue a **substituição** de um exercício ainda não realizado do **acréscimo opcional de volume**. A substituição não conta séries extras.
- Em **Tenho energia para mais**, a sinalização explícita de energia é apenas uma condição inicial: o motor exige séries realizadas na sessão atual, RIR, histórico comparável, volume e recuperação adequados. Muay Thai recente, dor relevante ou fadiga impedem aumentos automáticos.
- Quando elegível, o usuário escolhe **uma única opção**: acrescentar uma série ao movimento concluído ou incluir uma variação com outra máquina/equipamento (inicialmente com uma série vazia). Não há registro de treino realizado sem carga e repetições reais.
- O rascunho persiste a escolha opcional (`extraChoice`) sem alterar dados anteriores, e recomendações são reavaliadas ao confirmar a ação.

## Muay Thai: golpes, tempo e orientação da sessão seguinte
- Exaustão de chutes e socos usa contagem de repetições; quando pertinente, registre **por lado** (ex.: 50 chutes por perna), sem converter automaticamente em 100 golpes executados no histórico.
- Combinações são registradas por tempo, como **3 minutos de jab + direto + chute**; é possível registrar múltiplos blocos.
- Os tipos do catálogo são `exhaustion`, `combination`, `conditioning` e `technique`; registros antigos sem categoria ou lateralidade continuam válidos.
- Na aba Muay Thai e no início, um painel indica orientação de recuperação com base em esforço percebido, fadiga, dor no joelho, treino recente e tipo dos exercícios realizados.
- Quando há sinal de alerta, a FORJA sugere descanso ou trabalho leve em vez de progredir intensidade; a indicação de musculação também respeita essas cautelas, sem remover blocos pendentes.
- A orientação não estima desgaste fisiológico a partir de um número de golpes e deve ser conferida com o relato de recuperação do próprio dia.

## Registro rápido e check-in diário (UX7)
- RIR 0/1/2/3 por toque durante o exercício: o aplicativo salva somente o esforço informado, sem completar repetições ou cargas por conta própria.
- Botão de conferência da série exige carga e repetições válidas. Conferência final mostra séries parciais e RIR ausentes sem bloquear uma sessão válida.
- Check-in **do dia**, com energia, fadiga e joelho. Relato de dias anteriores não se torna automaticamente avaliação de recuperação atual; a fila e a orientação do Muay Thai respeitam os dados de hoje.
- Histórico antigo do Muay Thai permanece intacto. Entradas com unidades possivelmente ambíguas ou sem categoria exibem aviso contextual, sem correção automática nem penalização da pessoa que usou uma interface anterior.
- Mantidas as chaves persistentes do armazenamento; nenhum histórico, rascunho ou backup foi apagado.

## Migração segura e histórico no celular (UX8)
- O backup JSON anterior segue compatível com a versão v1 da FORJA; o arquivo privado preparado contém apenas um campo `migrationAudit` adicional (não altera sessões reais).
- A importação verifica as referências de exercícios e a estrutura do Muay Thai. Em instalação vazia, importa o histórico completo; se já houver registros, mescla por IDs estáveis, mantendo os registros e configurações do celular em caso de conflito.
- Pesagens com data igual não são duplicadas. Treinos e sessões de Muay com IDs iguais também não são duplicados.
- Quando há rascunho em andamento, não apaga o rascunho para importar o histórico. A importação e a restauração são operações locais, nunca fazem upload automático ao repositório.
- Exporte um backup recente do celular antes da importação para ter uma cópia independente. Entradas de Muay antigas continuam com dados originais, sem inferência de repetições ou intensidade.

## UX9 — Início claro e catálogo independente
- A tela inicial mostra **uma ação principal** (continuar treino em andamento ou iniciar bloco recomendado), a avaliação de recuperação em seção recolhível e, de forma discreta, o último treino e acesso ao Muay Thai.
- Gráficos, pesagens, metas e volume ficam na aba Evolução; o histórico permanece em Histórico, sem poluir a primeira tela.
- Navegação inferior: Início, Treinos, Catálogo, Evolução e Histórico. Ajustes são acessados pelo ícone do cabeçalho.
- O catálogo global lista todos os exercícios (ativos, inativos e alternativas), busca por nome/equipamento/músculo, filtra por grupo e mostra o status da ficha.
- Incluir uma opção do catálogo na ficha é uma ação explícita, **não inicia sessão** e não registra séries imaginárias. Filtrar e consultar não alteram histórico ou rascunho.
- O protótipo foi preparado para revisão visual no Figma; publicação no site depende de CI verde.

## Circunferências corporais (14/11/2026)
- Aba Evolução → Medidas corporais: desenho vetorial ilustrativo, valores sobrepostos por região (pescoço, peitoral, braços e antebraços por lado, abdômen no umbigo, quadril, coxas e panturrilhas por lado), abas de medidas atuais e histórico.
- Cada aferição pode ser salva e corrigida com data e valores parciais, validando unidades em centímetros. Comparações indicam diferenças absolutas, não inferências de gordura ou massa muscular.
- Registros ficam em `bodyMeasurements` no backup pessoal local, não em código público; BACKUPS v1 antigos continuam válidos. O importador mescla aferições pela data, preservando as existentes no celular.
- O backup pessoal aferido em 14/11/2026 é um artefato privado compartilhado à parte, nunca incluído no repositório. Abrir uma versão nova do app não injeta medições pessoais automaticamente.

## UX10 — Registro de Muay Thai e Histórico compacto
- Muay Thai: início rápido, esforço e fadiga por toque; duração e joelho visíveis; data, local, tipo, observações e escalas precisas em seção avançada.
- Exercícios realizados: quatro atalhos em primeiro plano, demais em seção recolhível; volume e número de blocos diretamente editáveis. Nome, categoria, unidade e lateralidade em detalhes opcionais, preservando significado exato de chutes por lado e combinações cronometradas.
- Histórico: calendário recolhível, três sessões de musculação e três de Muay Thai inicialmente visíveis, expansão de cinco em cinco e cartões com detalhes fechados até serem solicitados. Avaliação pendente do joelho mantém a sessão aberta quando mostrada.
- Nenhuma informação legada é preenchida ou convertida automaticamente; importação, histórico, rascunhos e chaves locais permanecem intactos.
