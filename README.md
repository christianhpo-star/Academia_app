# FORJA — Academia_app

Aplicativo web **mobile-first**, instalável como PWA, para registrar treino de força, acompanhar a evolução das cargas e sugerir quando **manter, repetir ou aumentar** com cautela. Feito sob medida para uma rotina com musculação 5–6 vezes por semana, Muay Thai às segundas, quartas e sextas e meta inicial de 88,3 para 82 kg até 14/01/2027.

## Funcionalidades da versão 1

- Histórico real por exercício, com carga (kg ou kg/halter), repetições e RIR (repetições em reserva) **por série**.
- Separa séries de **aquecimento** das séries efetivas; inclui o **supino com halteres** como exemplo editável: aquecimento 20 kg, depois 22,5 / 25 / 25 kg por halter. **Não apresenta essas cargas como treino concluído**.
- Sugestão explicável de progressão: exige **duas sessões consecutivas** atingindo a meta antes de recomendar aumento. No modo pirâmide compara a série efetiva mais pesada; com carga estável avalia as séries efetivas.
- Regra conservadora para o **joelho**: sem aumento automático caso haja dor no exercício, dor no dia seguinte ou ausência dessas informações. Uso de joelheira não é considerado liberação de carga.
- Divisão flexível de blocos **A (costas/bíceps), C (quadríceps), B (peito/tríceps), D (posteriores/glúteos)**. Ajustes para fadiga e dor; possibilidade de escolher qualquer bloco manualmente.
- Edição de exercícios, séries, metas de repetições, incremento de carga, unidade e método de progressão; ativação/desativação de variações.
- Peso corporal e gráfico de tendência rumo à data-alvo.
- **Local-first**: dados armazenados via `localStorage` no navegador, sem servidor ou conta; exportação/importação JSON e exportação de séries CSV.
- **PWA offline** após primeiro acesso HTTPS (incluindo GitHub Pages).

## Executar

Não há dependências, bibliotecas de terceiros, login ou banco de dados.

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000/`. Para testes do motor de sugestão:

```bash
node --test tests/engine.test.cjs
```

## Publicação no GitHub Pages

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, selecione `main`, pasta `/ (root)` e salve.
3. Acesse `https://christianhpo-star.github.io/Academia_app/` após a publicação.
4. No celular, abra o endereço em HTTPS e escolha **Adicionar à tela de início** / **Instalar app**, se oferecido pelo navegador.

> Se esta versão estiver numa branch ou pull request, primeiro integre-a à `main` antes de selecionar `main` no Pages. O app não está publicado automaticamente só por salvar o código.

## Segurança e privacidade

Este é um **diário de treino com regras auxiliares**, não prescrição médica, fisioterapêutica ou avaliação da segurança da articulação. Dor localizada abaixo da patela deve ser examinada se recorrente; não progrida agressivamente no leg press só porque uma joelheira compressiva reduziu a dor. Se houver dor forte, travamento, instabilidade ou inchaço, suspenda o exercício provocador e procure atendimento.

Não inclua dados pessoais sensíveis no código-fonte ou em issues públicos. O repositório contém apenas um exemplo de rotina; registros pessoais de treinos **não vão para o GitHub**. Os dados ficam somente no aparelho. Se apagar os dados do navegador ou trocar de aparelho, será necessário restaurar um backup. A exportação JSON contém dados de treino e peso; armazene-o com cuidado.

## Melhorias previstas

- Histórico de evolução de força por exercício com gráficos.
- Cronômetro de descanso opcional.
- Sincronização privada opcional entre dispositivos, com autenticação e consentimento.
- Opção para períodos de deload e marcação de semanas com Muay Thai mais intenso.
