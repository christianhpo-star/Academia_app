# Mapa muscular do histórico — 7, 30 e 90 dias

## Objetivo e localização

Em **Evolução → Treinos**, substituir o gráfico principal de barras por bloco A/B/C/D por uma ilustração original do corpo completo. O usuário escolhe Frente/Costas e 7, 30 ou 90 dias, identifica a distribuição relativa do treino e consulta a contribuição dos exercícios ao tocar em uma região. O quadro numérico anterior de volume muscular continua recolhido em **Constância e volume** para consulta.

O mapa utiliza o histórico salvo no aparelho, sem importar dados pessoais para serviços externos. Não cria sessões, não altera fichas, não muda recomendações e não grava preferências de consulta no armazenamento. A ilustração é SVG local e faz parte do cache offline.

## Modelo de dados

`muscle-history.js` lê somente `state.sessions`; não inclui o rascunho atual nem atividades de Muay Thai. A janela inclui hoje e os N−1 dias anteriores, pela data local do app. Datas futuras, inexistentes ou fora da janela são excluídas. Sessões com o mesmo ID são contadas uma vez; duas sessões diferentes no mesmo dia somam volume, mas não duplicam o dia ativo.

São válidas as séries com carga positiva até 1.500 e repetições inteiras de 1 a 100, conforme `ForjaDose.workSets`. Campos vazios, booleanos, aquecimentos e exercícios explicitamente pulados ficam fora. Séries registradas com carga zero não entram nesta versão, preservando o critério do volume atual; isso está explicado na interface. Carga, RIR e esforço não multiplicam a contribuição. Não é um cálculo de tonelagem.

O mapeamento usa `ForjaExerciseAnatomy.describe(id)`, a mesma classificação revisada das ilustrações dos 74 exercícios. Cada série soma **1** em cada região principal e **0,5** em cada auxiliar. Uma região listada nas duas funções só conta como principal. O motor `dose.js` e suas regras de recomendação permanecem independentes; os totais detalhados por região não devem ser somados como se fossem um único total de séries do corpo.

Retorno por região: séries principais, séries auxiliares sem ponderar, total equivalente, sessões, dias ativos, última data e contribuição por exercício. Registros desconhecidos ficam fora da distribuição e produzem um aviso de cobertura parcial. `coverage` é a fração de séries conhecidas entre as séries válidas da janela.

## Regiões e incerteza

São **17 regiões**: peitoral maior; deltoides anterior, lateral e posterior; trapézios superior e médio; romboides; latíssimo do dorso; bíceps; tríceps; antebraços; quadríceps; posteriores da coxa; glúteo máximo; abdutores do quadril; adutores da coxa; panturrilhas.

Frente e Costas compartilham os mesmos totais e a mesma escala. Regiões visíveis nas duas vistas não duplicam a contagem. Os lados recebem a mesma cor porque o histórico não sustenta uma estimativa independente de direita e esquerda. A geometria é esquemática; trapézio médio e romboides aparecem em áreas adjacentes para permitir seleção, não como uma exposição literal das camadas anatômicas.

Abdômen, oblíquos e lombar ficam **hachurados / não estimados**. O catálogo ainda não quantifica sua participação; não são rotulados como zero trabalho. Para as regiões mapeáveis, cinza significa ausência de séries classificadas dentro da janela, não diagnóstico de falta de estímulo.

## Escala e interação

| Estado | Regra dentro da janela | Cor |
| --- | --- | --- |
| Sem registro | Total equivalente zero | Cinza azulado |
| Menor volume | Positivo, até 1/3 do maior total | Azul |
| Intermediário | Acima de 1/3, até 2/3 do maior total | Ciano |
| Maior volume | Acima de 2/3 do maior total | Verde claro |
| Não estimado | Fora do mapeamento atual | Hachura |

Os terços são uma regra de visualização, não limiares fisiológicos. A escala se recalcula quando o período muda. Não permite comparar a intensidade da mesma cor entre janelas como se os valores absolutos fossem iguais. "Menos registrados" serve para revisar a distribuição da ficha, sem recomendar aumento automático de séries, diagnosticar recuperação ou estimar hipertrofia.

Seleção: toque no desenho, Enter/Espaço numa região, seletor HTML ou lista textual recolhível. O detalhe mostra principais/auxiliares, última data e exercícios que contribuíram. Selecionar uma região não visível troca a vista automaticamente. Trocar Frente/Costas manualmente limpa uma seleção não visível. Os controles de período/vista permanecem montados; a atualização fica restrita ao conteúdo visual, com foco restaurado no mesmo tipo de controle.

## Referências

- Pelland, J. C. et al. *The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains*. Sports Medicine, 2026; 56:481–505. [PubMed 41343037](https://pubmed.ncbi.nlm.nih.gov/41343037/), [DOI 10.1007/s40279-025-02344-w](https://doi.org/10.1007/s40279-025-02344-w). Fundamenta a convenção de contagem fracionada já existente no Forja; a extrapolação para este painel é uma descrição de registros, sem validação individual ou promessa de resultado.
- OpenStax. *Anatomy and Physiology 2e*, [11.6 — Pelvic Girdle and Lower Limbs](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs). Referência de localização anatômica. Arte original do Forja, derivada dos próprios SVGs de exercícios; nenhum desenho externo copiado.
- Mapeamentos existentes: [Frente/Costas](anatomy-front-back.md) e [membros inferiores](anatomy-lower-body.md).

## Validação

- `tests/muscle-history.test.cjs`: limites das janelas, datas reais/bissextas, principais/auxiliares, cobertura dos 74 IDs, exclusões, duplicidades, desconhecidos, níveis relativos e imutabilidade.
- `tests/muscle-map.test.cjs`: cobertura anatômica e vistas, seleção única, IDs SVG únicos, estados textuais e escape de conteúdo.
- `tests/smoke_muscle_history.py`: dados sintéticos, calendário fixo, 7/30/90 dias, Frente/Costas, toque/teclado, foco, nenhuma gravação, rascunho preservado, vazio/desconhecido e capturas em 320/390/412/768/1440 px.
- Smokes de força, flexibilidade da ficha e nutrição acompanham o novo painel usando a ordem de scripts publicada. As demais regressões permanecem obrigatórias na CI.
- Testes responsivos em Chromium não equivalem a homologação física em um celular Samsung.

Release de cache: `20261122-muscle13`, shell `v60`.
