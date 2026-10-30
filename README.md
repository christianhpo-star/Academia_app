# FORJA — Academia_app

Aplicativo web **mobile-first**, instalável como PWA, para registrar treino de força, acompanhar a evolução das cargas e sugerir quando **manter, repetir ou aumentar** com cautela. Feito sob medida para uma rotina com musculação 5–6 vezes por semana, Muay Thai às segundas, quartas e sextas e meta inicial de 88,3 para 82 kg até 14/01/2027.

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
