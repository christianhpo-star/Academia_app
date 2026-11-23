# Rótulos fotografados — 22/11/2026

Registro de dois alimentos do usuário no catálogo FORJA. Os valores foram transcritos das fotos da embalagem, sem identificar marca que não estivesse legível e sem assumir que o alimento foi consumido. Nenhuma refeição ou dado de treino/objetivo é modificado automaticamente.

## Hambúrguer de frango congelado
- ID: photo:hamburguer-frango-56g
- Porção de rótulo: **1 unidade de 56 g**
- Por 56 g: 85 kcal; carboidratos 1,8 g; proteína 7,6 g; gorduras 5,3 g; fibras 0 g
- Por 100 g: 154 kcal; carboidratos 3,2 g; proteína 14 g; gorduras 9,5 g; fibras 0 g
- Na embalagem também são legíveis: saturadas 2,4 g/56 g (4,2 g/100 g), sódio 316 mg/56 g (564 mg/100 g), 0 g de gorduras trans e açúcares declarados
- As tabelas podem arredondar a porção em relação ao valor por 100 g; o aplicativo usa **os valores impressos** na opção “1 unidade” e o valor por 100 g nas outras medidas, incluindo gramas personalizadas.

## Pão de forma tradicional
- ID: photo:pao-forma-tradicional-50g
- Porção de rótulo: **2 fatias de 50 g**
- Por 50 g: 138 kcal; carboidratos 25 g; proteínas 4,5 g; açúcares totais 5,5 g; açúcares adicionados 2,3 g
- Por 100 g: 275 kcal; carboidratos 50 g; proteínas 9 g; açúcares totais 11 g; açúcares adicionados 4,5 g
- **Gorduras e fibras estão ilegíveis na foto:** ficam null, nunca zero ou inferidas de pão genérico.
- Ao selecionar “2 fatias”, usa o rótulo (138 kcal); “1 fatia” e gramas exatos usam valores por 100 g (arredondamentos podem causar pequenas diferenças).

## Compatibilidade / QA
- Os dois itens são incluídos apenas na biblioteca padrão e aparecem na pesquisa sem acentos, ordenação de café/lanche e jantar; não entram no histórico de consumo sem toque do usuário.
- IDs estáveis e origem registrada no snapshot; alterações futuras do catálogo não alteram refeições anteriores.
- A UI exibe medidas por porção e em gramas inclusive para estes dois produtos, com prévia antes de adicionar.
- A composição ausente permanece ausente nos totais sem criar falsa precisão nem zerar a meta pessoal de 2.170 kcal.
