# FORJA — Estimativas de açaís trufados Doce Cascão

## Identificação das imagens
- Açaí trufado Branco, copo de 500 ml: açaí com creme Ninho em camadas e raspas de chocolate branco.
- Açaí trufado Preto, copo de 500 ml: açaí com creme de avelã em camadas e raspas de chocolate.
- O copo de 500 ml indica volume, não massa. As imagens não oferecem a receita nem pesos medidos.
- Adicionais pagos são separados e não entram automaticamente nas estimativas dos copos básicos.

## Premissas
Cenário central por copo: 300 g de açaí adoçado, 90 g de recheio e 15 g de raspas.
Cenários extremos de composição: 250–350 g de açaí, 60–120 g de creme e 10–25 g de chocolate. Não são limites estatísticos.
Por 100 g, os componentes de referência foram modelados com:
- Açaí com guaraná: 145 kcal, P 0,8 g, C 24,5 g, G 4,8 g.
- Creme Ninho de confeitaria: 330 kcal, P 7,4 g, C 56 g, G 8,4 g.
- Chocolate branco: 549 kcal, P 5,87 g, C 59,2 g, G 32,1 g.
- Creme de avelã tipo Nutella: 542 kcal, P 6,3 g, C 58 g, G 31 g.
- Chocolate ao leite: 537 kcal, P 5,8 g, C 57 g, G 31 g.

Esses valores são hipóteses nutricionais de ingredientes similares, não resultados laboratoriais nem fichas específicas da loja. As marcas e proporções podem ser outras.

## Resultados estimados — copo inteiro
| Nutriente | Branco, centro | Branco, faixa | Preto, centro | Preto, faixa |
| --- | ---: | ---: | ---: | ---: |
| Energia | 814,4 kcal | 615,4–1040,8 | 1003,4 kcal | 741,4–1292,2 |
| Proteínas | 9,9 g | 7,0–13,1 | 8,9 g | 6,4–11,8 |
| Carboidratos | 132,8 g | 100,8–167,8 | 134,3 g | 101,8–169,6 |
| Gorduras | 26,8 g | 20,3–34,9 | 46,9 g | 33,7–61,8 |

Baixa confiança. Meio copo corresponde a metade proporcional, embora o recheio em camadas possa se distribuir irregularmente. As faixas são cenários, e a ingestão real pode ficar fora delas.

## Adicionais opcionais (não incluídos)
Porção extra hipotética de 20 g, cenário de 15–25 g:
- Creme Ninho: centro ≈66 kcal, faixa 49,5–82,5; P 1,5 g, C 11,2 g, G 1,7 g.
- Creme de avelã: centro ≈108,4 kcal, faixa 81,3–135,5; P 1,3 g, C 11,6 g, G 6,2 g.

## Referências para auditoria
- Imagens do cardápio Doce Cascão fornecidas pelo usuário em 15/11/2026.
- USDA FoodData Central, chocolates genéricos: https://fdc.nal.usda.gov/
- Nestlé Professional, referências de confeitaria: https://www.nestleprofessional.com.br/
- Nutella Brasil, informação nutricional: https://www.nutella.com/br/pt/
- Referências comerciais de açaí adoçado com xarope/guaraná; a composição varia entre marcas e preparações.

Fontes externas são aproximações dos ingredientes; NÃO demonstram o produto final da sorveteria.

## Regras técnicas
O campo opcional item.estimate armazena confidence='low', servingLabel, assumptions e objetos low/central/high para energia, proteína, carboidratos e gordura. Ele é preservado no registro e em favoritos sem transformar valores estimados em nutrientes por 100 g verificados.
O resumo estimado é exibido à parte dos valores de rótulo; não calcular consumo total ou déficit a partir de um dia incompleto.
Não registrar alimentos automaticamente para o usuário ou sua esposa; cada registro descreve apenas o que foi informado.

Para melhorar estimativas: solicitar à loja peso do conteúdo do copo, base usada, peso do recheio, cobertura e tabelas nutricionais dos ingredientes.
