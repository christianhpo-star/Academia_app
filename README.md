# FORJA — Academia_app

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
- O catálogo inicial possui 20 movimentos adicionais com IDs estáveis, equipamento e região muscular. A seleção pela busca é local; qualquer exercício integrado ao histórico mantém seu identificador.
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
