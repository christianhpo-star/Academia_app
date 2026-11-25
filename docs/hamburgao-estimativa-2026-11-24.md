# Hamburgão assado fotografado (24/11/2026)

## Identificação
A fotografia recebida mostra um pão assado dourado com gergelim, recheio semelhante a hambúrguer de carne e fatias que lembram presunto; queijo é possível, mas **não confirmado**. Não há rótulo, balança, receita do estabelecimento nem informação sobre óleo, molho, maionese ou a parte já consumida. A estimativa não identifica fabricante.

O catálogo adiciona **`recipe:hamburgao-assado-carne-presunto-2026`**, categoria *Salgados e lanches*, com buscas “hamburgão”, “hamburgão assado” e equivalentes sem acentos. Um ícone genérico de hambúrguer foi usado em vez de colocar a fotografia privada no repositório.

## Referência e cálculo
- **Comparação externa:** TBCA/USP-FoRC, código **BRC0863A**, cheeseburger de hambúrguer bovino grelhado com pão e muçarela. A tabela traz 267 kcal, 13,5 g de proteína, 29,2 g de carboidratos e 10,9 g de lipídios por 100 g. Esse item **não tem a mesma receita** do fotografado.
- Fonte consultável: https://www.tbca.net.br/base-dados/int_composicao_alimentos.php (pesquisar BRC0863A); tabela por medida caseira com descrição do cheeseburger.
- A preparação fotografada pode ter pão mais volumoso, presunto, outro tipo de queijo ou molhos; os intervalos abaixo são **hipóteses informativas de baixa confiança**, não tabela alimentar oficial nem cálculo por ingredientes pesados.

| Por 100 g | Limite inferior | Centro | Limite superior |
|---|---:|---:|---:|
| Energia (kcal) | 230 | 270 | 340 |
| Proteínas (g) | 10 | 14 | 18 |
| Carboidratos (g) | 25 | 29 | 32 |
| Gorduras (g) | 10 | 11 | 16 |

Uma unidade **hipotética de 220 g** fornece: **≈594 kcal** (506–748 kcal), **30,8 g de proteínas**, **63,8 g de carboidratos**, **24,2 g de gorduras** na estimativa central. O peso de 220 g **não é uma medição do alimento da foto**. Fibras, sódio e micronutrientes não são estimados.

## Operação no FORJA
1. Alimentação → Lanche ou Jantar → Adicionar → buscar “hamburgão”. Resultado aparece também entre os primeiros itens sugeridos.
2. Por padrão, o seletor mostra **1 unidade (≈220 g)**, mas oferece meia unidade (≈110 g), menor (≈180 g), maior (≈280 g), 100 g e **Peso exato em gramas** (suporta decimais).
3. Cada quantidade recalcula os cenários inferior, central e superior. A interface assinala a baixa confiança; **não transforma a estimativa em valores de rótulo confirmados**.
4. Abrir ou procurar o alimento **não registra uma refeição automaticamente**. Só confirma o consumo depois de adicionar ao diário e salvar. O usuário pode alterar quantidades ou excluir o item sem modificar registros anteriores.
5. O catálogo é **offline**; não depende de conexão após carregamento do novo service worker.

## Garantias
- Fotos pessoais não entram no repositório nem no cache público.
- Não vincular a porção fictícia à data 24/11/2026 como refeição consumida.
- `nutrientsPer100g` permanece `null`; somente o objeto `estimate` contém números e faixas, preservando a distinção de fontes e a incerteza.
- Testes automáticos: `tests/hamburgao-assado.test.cjs`, `tests/smoke_hamburgao.py`; regressão geral para metas, refeições, históricos e sincronização de assets.
