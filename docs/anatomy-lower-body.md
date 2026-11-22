# Mapa muscular dos membros inferiores

## Escopo

Estender o componente original de ilustração SVG aos **33 exercícios de perna** presentes na união de `data.js` e `flex.js`. Com os 41 exercícios de membros superiores já revisados, a cobertura é de 74 IDs estáveis. Catálogo e sessão usam o mesmo mapa, com seletor **Frente / Costas**, legenda textual e distinção visual entre principal e auxiliares.

O desenho inferior concentra quadril, coxas e pernas para manter a leitura em telas pequenas. É uma localização esquemática: não apresenta percentuais de ativação, estimativa individual de esforço ou resultado esperado. A classificação orientativa acompanha os grupos já existentes em `dose.js`; esta entrega não altera cálculos, recomendações, séries ou histórico.

## Cobertura por família

| Família | IDs estáveis | Principal | Auxiliares | Vista inicial |
| --- | --- | --- | --- | --- |
| Agachamentos, leg press e apoio unilateral | `agachamento-hack`, `agachamento-livre`, `agachamento-goblet`, `agachamento-smith`, `leg-press`, `leg-press-horizontal`, `bulgaro`, `passada-reversa`, `step-up-baixo` | Quadríceps | Glúteo máximo | Frente |
| Extensão de joelho | `extensora`, `extensora-d`, `extensora-unilateral` | Quadríceps | — | Frente |
| Flexão de joelho | `flexora-c`, `flexora-d`, `flexora-sentada`, `flexora-unilateral`, `flexora-em-pe` | Posteriores da coxa | — | Costas |
| Stiff / romeno | `stiff`, `terra-romeno-halter` | Posteriores da coxa | Glúteo máximo | Costas |
| Extensão de quadril | `elevacao-pelvica`, `gluteo-cabo`, `ponte-gluteo`, `hip-thrust-maquina` | Glúteo máximo | — | Costas |
| Pull-through | `pull-through-polia` | Glúteo máximo | Posteriores da coxa | Costas |
| Sumô na máquina | `sumo-maquina` | Glúteo máximo | Quadríceps e adutores | Costas |
| Abdução de quadril | `abdutora`, `abducao-polia` | Abdutores do quadril | — | Costas |
| Adução de quadril | `cadeira-adutora`, `aducao-polia` | Adutores da coxa | — | Frente |
| Elevação de panturrilhas | `panturrilha-leg`, `panturrilha-banco`, `panturrilha-em-pe`, `panturrilha-unilateral-pe` | Panturrilhas — gastrocnêmio e sóleo | — | Costas |

## Decisões anatômicas e limites

- Quadríceps e adutores aparecem na face anterior/medial das coxas; posteriores, glúteos e panturrilhas aparecem na vista posterior. A região dos abdutores é localizada na lateral superior do quadril. Músculos ocultos não são transferidos para a outra face: as notas do componente indicam qual vista consultar.
- O sóleo fica profundo ao gastrocnêmio; o vasto intermédio, profundo ao reto femoral. A representação por região não equivale a uma dissecção das camadas musculares. O tendão de Aquiles não recebe destaque de músculo. A geometria é original e não reproduz as imagens das referências.
- `panturrilha-banco` reúne as variantes sentada e em pé. A posição do joelho não é inferida: mantém-se a legenda geral de panturrilhas. O estudo de Kinoshita e colaboradores encontrou respostas distintas do gastrocnêmio entre essas posições; esses resultados não são convertidos em percentuais no desenho.
- `flexora-d` reúne mesa e cadeira flexora. O destaque representa os posteriores da coxa sem inventar qual aparelho foi utilizado.
- `sumo-maquina` não identifica um aparelho ou execução únicos. A legenda deve informar que a participação de glúteos, quadríceps e adutores varia com o movimento e o equipamento. A ordem visual principal/auxiliares não é uma classificação universal de intensidade.
- Nos movimentos compostos, a ilustração resume grupos relevantes. O trabalho de Kubo e colaboradores mostra que a profundidade do agachamento pode modificar adaptações entre os grupos estudados; não se deduz daí a ativação ou o resultado de uma sessão individual.

## Atividades em casa e exercícios personalizados

`muay.js` contém sugestões textuais como Polichinelos, Agachamento com salto e Afundos. Elas são atividades de Muay/condicionamento com IDs gerados no registro, não os IDs estáveis do catálogo de força. Este mapa não tenta reconhecer nomes livres nem atribui anatomia automática a exercícios personalizados. `ponte-gluteo`, que possui ID estável e pode ser realizada no solo, está incluída.

## Verificação

`tests/exercise-anatomy.test.cjs` verifica a cobertura dos 33 IDs, regiões corretas em Frente/Costas, ausência de destaques inventados na vista oposta e IDs SVG únicos. `tests/smoke_leg_anatomy.py` verifica catálogo e sessões C/D, teclado/toque, 320/390/412 px e preservação de duas séries completas, dos próprios campos e do armazenamento durante a troca de vista. O fluxo de detalhe preserva as verificações de consulta sem gravação, cancelamento e confirmação explícita antes de adicionar à ficha.

A integração exige CI aprovada e revisão das capturas; os resultados são registrados na PR. Testes de navegador responsivo não equivalem a homologação física no Samsung.

## Referências

- OpenStax. *Anatomy and Physiology 2e*, seção 11.6 — [músculos da cintura pélvica e dos membros inferiores](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs). Referência para localização e ações anatômicas; nenhuma imagem foi reutilizada.
- Kinoshita M. et al. *Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training*. Frontiers in Physiology, 2023. [PMID 38156065](https://pubmed.ncbi.nlm.nih.gov/38156065/). DOI: 10.3389/fphys.2023.1272106. Estudo direto de treinamento; usado para limitar inferências sobre variantes de panturrilha.
- Kubo K.; Ikebukuro T.; Yata H. *Effects of squat training with different depths on lower limb muscle volumes*. European Journal of Applied Physiology, 2019. [PMID 31230110](https://pubmed.ncbi.nlm.nih.gov/31230110/). DOI: 10.1007/s00421-019-04181-y. Estudo direto de treinamento; usado para evitar uma hierarquia rígida de participação muscular.
