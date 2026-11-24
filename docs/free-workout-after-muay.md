# FORJA — Treino livre, inclusive após Muay Thai

Data: 23/11/2026. Implementado no PR #68, como complemento ao editor rápido de Muay.

## Propósito
Permitir registrar **qualquer sessão curta de exercícios já realizada** sem iniciar ou marcar como concluído um bloco A/B/C/D. Exemplo: após uma aula de Muay, o usuário realiza dois exercícios abdominais e vai embora.

## Fluxo
1. Entrar por **Início → Registrar treino livre**, **Treinos → + Registrar treino livre** ou **Histórico/Muay → Registrar treino livre após Muay**.
2. Escolher a data (inicialmente hoje). Quando o atalho veio do Muay e há sessão concluída no mesmo dia, o app guarda um identificador de referência `afterMuayId`; os dois treinos continuam salvos separadamente.
3. Buscar no catálogo completo, com **atalhos para abdômen** (crunch, inverso e outras opções existentes). Também é possível criar exercício avulso com nome e modo de carga: com peso externo ou peso do corpo.
4. Em cada exercício selecionado, registrar **carga utilizada**, **repetições realizadas** e RIR opcional. `+ Série` permite acrescentar linhas. O exercício pode ser retirado enquanto não houver repetições preenchidas; não apaga silenciosamente execução.
5. Informar observações e esforço opcional, salvar. O app exige **pelo menos uma série efetiva válida**; campos vazios não são interpretados como treino feito.

## Isolamento e preservação de dados
- Uma sessão livre é salva em `state.sessions` com `planId:'FREE'` e `kind:'free'`. Reutiliza exatamente o contrato de séries executadas da musculação: carga válida, repetições inteiras e aquecimentos não contam como séries efetivas.
- `planId:'FREE'` **não integra `DATA.rotation`**; funções de próximo treino e conclusão de rodada continuam usando exclusivamente os quatro blocos preexistentes.
- `plannedIds:[]` e `skipped:[]` impedem marcar exercícios da ficha como pulados. A tela de treino livre não altera campos de séries, ordem ou ativação da ficha.
- Exercício do catálogo opcional passa a integrar a biblioteca pessoal como `active:false` quando necessário, mas não é ativado automaticamente. Exercício manual criado para sessão livre recebe `group:'FREE'` e `active:false` (sem ligação com A/B/C/D).
- Peso do corpo recebe explicitamente ID `free-bodyweight-...` e aceita `0 kg adicionais` **somente quando repetições válidas estiverem presentes**. Outros exercícios livres sem equipamento adequado devem informar carga positiva; o próprio app explica isso.
- Exercícios personalizados ainda não têm associação anatômica validada. O mapa registra corretamente as séries classificadas do catálogo, mas avisa sobre conjuntos não classificados; nunca inventa músculos trabalhados a partir de texto digitado pelo usuário.
- Rascunho de sessão usa o mesmo armazenamento recuperável `forja.academia.draft.v1`. A versão anterior e o histórico de musculação e Muay são preservados. Alterações não sobrescrevem um treino em andamento sem confirmação.
- Sessões livres aparecem como **Treino livre** no histórico/calendário, com indicação **Após Muay Thai** quando vinculadas. Não se misturam com blocos Muay de rounds/combos, nem convertem golpes em séries.

## Garantias e validação
- Testes Node de criação de rascunho, exercícios do catálogo/personalizados, séries com peso do corpo, proteção contra exclusão, histórico e não alteração da rodada.
- Teste Playwright mobile (390px e 320px) com Muay registrado, início do treino livre após aula, dois exercícios abdominais + personalizado, registro de séries reais, fechamento/reabertura do app, conferência da sessão salva, catálogo pessoal e mapa muscular.
- Os testes da versão antiga continuam verificando preservação de histórico e registros domésticos de Muay.

**Exemplo prático:** na mesma data, "Muay Thai — Aula na academia" e "Treino livre — Abdominal no solo (2 séries), abdominal inverso (1 série)" são sessões distintas. O mapa muscular recebe 3 séries abdominais classificadas; não se atribuem séries a socos ou chutes e nenhum bloco A/B/C/D é consumido.
