# Abdômen, cardio opcional e exploração direta do mapa

## Comportamento

| Exercício | Destino | Configuração inicial | Registro |
| --- | --- | --- | --- |
| Abdominal no solo (`abdominal-solo`) | Final do bloco A, ativo | 2 × 10–15 | Peso do corpo; carga adicional 0 permitida |
| Abdominal inverso (`abdominal-inverso`) | Final do bloco B, ativo | 2 × 10–15 | Peso do corpo; carga adicional 0 permitida |
| Abdominal na polia (`abdominal-polia`) | Alternativa do catálogo A | 2 × 10–15 | Carga positiva do aparelho |
| Pallof press (`pallof-press`) | Alternativa do catálogo B | 2 × 10–12 por lado | Carga positiva; ambos os lados contam como uma série |

São configurações iniciais de produto, editáveis, sem pretensão de dose individual ideal. A rotação A/C/B/D permanece. O treino abdominal aparece como complemento de duas fichas existentes. As alternativas são incluídas por ação do usuário. Não há inferência de trabalho abdominal a partir da simples estabilização em agachamentos, remadas ou Muay Thai.

Os quatro exercícios têm mapas originais Frente/Costas. Crunch, inverso e polia atribuem participação principal ao reto do abdômen e auxiliar aos oblíquos; Pallof atribui principal aos oblíquos e auxiliar ao reto. É uma classificação descritiva aproximada, sem mensuração de ativação e sem separação artificial de músculos abdominais superiores/inferiores. A região lombar permanece sem estimativa.

## Séries com peso do corpo

`ForjaTrainingSets` é o contrato único de execução para motor, foco, flexibilidade, recomendações do catálogo e volume. Apenas os dois IDs de peso do corpo aceitam **0** numérico ou string numérica explícita. Repetições inteiras de 1 a 100 continuam obrigatórias; preencher somente a carga não registra execução. Branco, booleano, array, infinito e valores fora dos limites são rejeitados.

O campo da sessão informa **Carga extra** e começa em 0, com repetições e RIR vazios. Histórico e referência anterior distinguem peso do corpo de peso adicional. O editor preserva esse modo. Esses dois movimentos ficam fora da estimativa de força máxima e de gatilhos de queda de força baseados no lastro; as sugestões acompanham repetições e técnica. Não foi alterada a exigência de carga positiva nos demais IDs.

## Atualização de fichas existentes

`AcademiaData.ensureAbdomen` faz atualização aditiva, versionada por `abdomenDefaultsVersion: 1`. Acrescenta apenas IDs ausentes. IDs existentes, mesmo personalizados ou desativados, prevalecem. Não altera sessões nem rascunhos; portanto um treino já iniciado permanece com seu planejamento original. Respeita o limite de 200 exercícios sem inserção parcial. A atualização é aplicada também ao importar arquivo antigo. A cópia local de segurança e as chaves de armazenamento existentes são preservadas.

## Cardio opcional na sessão

O acordeão **Cardio (opcional)** permite adicionar Esteira, Escada, Bicicleta, Elíptico e Outro cardio. Cada modalidade tem minutos informados pelo usuário, até 300 por modalidade. São aceitos valores decimais; vazio e zero são omitidos. Tipos duplicados ou durações inválidas impedem salvar até correção, sem descartar o rascunho. Nenhum campo de cardio é obrigatório.

Contrato: `draft.cardio` e `session.cardio` são listas de `{type, minutes}`. A propriedade da sessão só é criada se houver cardio realizado. Rascunhos antigos não recebem linhas de cardio ao serem lidos. As modalidades e o total aparecem na conferência e no histórico do mesmo treino, e acompanham JSON de backup, restauração, mesclagem e exportação para IA. O CSV de séries continua específico de musculação.

Cardio permanece um complemento do treino de musculação: o salvamento da sessão ainda exige uma série efetiva. Não é criado um segundo treino, não altera a rodada A/C/B/D e não se transforma em séries musculares, estimativa de calorias ou recuperação presumida. `summarize` tolera itens antigos inválidos para a interface sem reescrever o arquivo original.

## Mapa compacto

Tocar na região seleciona o mesmo ID em **Explorar músculo** e substitui o conteúdo de um único detalhe. Em telas estreitas, o resultado aparece na área visível quando necessário. A navegação por teclado preserva foco e posição; movimento reduzido é respeitado. **Voltar ao corpo** retorna à região selecionada. Rankings e distribuição completa ficam juntos no acordeão fechado **Ver distribuição por região**. Controles de período e vista permanecem montados; a consulta não grava histórico ou rascunho.

## Verificação

- Testes Node: contrato de séries, valores inválidos, preservação/idempotência da ficha, exclusão de e1RM indevido, cardio opcional e normalização, cobertura de 78 exercícios e 19 regiões, 7/30/90 dias e vistas anatômicas.
- `smoke_abdomen.py`: instalação nova e antiga, rascunho/histórico preservados, edição/desativação, sessão com 0 kg válido, rejeição de 0 em máquinas, mapa e backup/importação.
- `smoke_cardio.py`: cardio opcional, múltiplas modalidades, recuperação do rascunho, valores inválidos, histórico e exportação/importação.
- `smoke_muscle_history.py`: toque real no SVG, seletor sincronizado, único detalhe, lista recolhida, retorno ao corpo, foco por teclado e nenhuma escrita no armazenamento.
- Capturas com dados sintéticos em larguras de celular; CI executa Chromium. Isso não equivale a ensaio em aparelho físico do usuário.

## Referências consultadas

- ACE, [Crunch](https://www.acefitness.org/resources/everyone/exercise-library/52/crunch/) e [Reverse Ab Crunch](https://www.acefitness.org/resources/everyone/exercise-library/76/reverse-crunch/): descrições dos movimentos e execução controlada. Textos resumidos em linguagem própria; imagens não copiadas.
- Mullane, Turner e Bishop. *The Pallof Press*. Strength & Conditioning Journal, 43(2), 121–128, 2021. [DOI 10.1519/SSC.0000000000000596](https://doi.org/10.1519/SSC.0000000000000596): função de antirrotação e técnica. Não valida os pesos de volume do app.
- OpenStax, [Axial Muscles of the Abdominal Wall and Thorax](https://openstax.org/books/anatomy-and-physiology/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax): referência anatômica; o SVG é original.
- ACSM, [atualização de treinamento resistido de 2026](https://acsm.org/resistance-training-guidelines-update-2026/): resistência com peso do corpo também constitui treino; aplicação individual requer contexto. A escolha específica de dois complementos A/B é uma decisão de produto conservadora e editável.

Release: `20261122-abdomen14`; cache offline `forja-shell-v61-20261122-abdomen14`.
