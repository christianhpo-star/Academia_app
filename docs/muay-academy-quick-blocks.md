# FORJA — Muay Thai na academia, registro por blocos e mapa corporal

Data: 23/11/2026. Escopo: somente treino na academia (`place='academia'`); a tela doméstica anterior, dados legados e histórico permanecem acessíveis sem conversões automáticas.

## Jornada escolhida

**Academia → Exaustão | Sequência | Sparring → Adicionar bloco → Ver blocos → Esforço opcional → Salvar treino.**

A UI mobile tem uma única área de entrada contextual, sem segunda janela. Há 3 botões grandes no topo da seção e apenas o formulário selecionado aparece. Os blocos já adicionados ficam em lista compacta, editáveis pela remoção e novo lançamento; a ficha de força e o treino em casa não mudam.

### Exaustão
- Tipo: soco, chute, agachamento bilateral e joelho (adição útil para a modalidade).
- Lateralidade: ambos com quantidade **por lado**, esquerdo ou direito; agachamento é bilateral.
- Atalhos 20, 50, Outro (valor editável) ou Escada.
- **Duas escadas claramente diferenciadas:** (a) Simples: rodadas de 1, 2, ... 10, total `1+2+...+10=55` repetições por lado; (b) Acumulada: rodadas `1`, `1+2`, `1+2+3`, ... até `1+...+10`, total de **220 repetições por lado** se todas as etapas forem concluídas. A acumulada corresponde ao exemplo escrito “1, 12, 123 ...”; o app identifica o protocolo escolhido para não confundir 55 e 220 ou representar 12/123 como contagem literal de uma só rodada.
- `quantity` continua sendo **repetições por lado** quando `side='each'`; não são minutos nem séries de força. `movement`, `limb`, `pattern`, `ladderTo` guardam o protocolo.

### Sequência cronometrada
- Golpes identificados: jab, direto, cruzado, chute direito/esquerdo, joelho direito/esquerdo.
- A ordem é preservada em `combo[]`; cada toque acrescenta uma etapa, podendo retirar etapas individualmente.
- `quantity` guarda a duração em minutos de **uma sequência repetida**; a quantidade de execuções da combinação **não** é inferida.
- Exemplo: Jab → Direto → Chute direito → Cruzado → Joelho direito, repetidos durante 5 min.

### Sparring
- Um eixo para regra de troca (`one`, `three`, `free`) e outro para técnicas permitidas (`boxing`, `kicks`), para evitar confundir “1 por 1” com “somente boxe”.
- `sets` são *rounds de sparring*, não séries de musculação; `quantity` guarda minutos por round; número de rounds e minutos não incluem intervalos.
- Contato informado como técnico/sem contato, leve ou controlado, sem sugerir golpes fortes nem dar orientações de ataque.

## Compatibilidade de dados e segurança
- O schema existente `muay.sessions[].activities[]` permanece. Campos estruturados são opcionais no validador; `fastVersion=2` distingue registros novos. Histórico antigo e sessão em casa usam o formulário anterior, sem inventar categoria, lado, golpes ou carga.
- O rascunho `muay.draft.quick` guarda seletores atuais e persiste localmente entre reaberturas. Não há sincronização com servidor nem exclusão silenciosa de registros anteriores.
- Máximo 30 blocos/sessão, duração e esforço validados, combo máximo 12 golpes; registro em branco não vira treino. Nome e detalhes são escapados na UI.
- Duração total da sessão, dor no joelho, fadiga e RPE são opcionais. Recomendações de recuperação tratam sparring com cautela; não há diagnóstico ou inferência de gasto calórico a partir de golpes.

## Integração com Mapa Corporal
O cálculo `M.exposure(sessions,today,days)` lê apenas registros novos com metadados de movimentos conhecidos. Padrões qualitativos:
- Socos: deltoides anterior/lateral, tríceps, antebraços e oblíquos podem participar.
- Chutes: quadríceps, glúteos, posteriores da coxa, panturrilhas e oblíquos podem participar.
- Agachamentos: quadríceps, glúteos e panturrilhas.
- Joelhos: quadríceps, glúteos, abdômen e oblíquos.
- Sparring técnico: participação provável em padrões de soco e, quando `kicks` permitido, também padrões de chute; **não** significa que cada golpe tenha sido executado.

O resultado apresenta **dias e sessões com atividade estruturada**, não carga por músculo. No mapa, contornos violetas pontilhados são somente indicação qualitativa. O preenchimento e as cores continuam exclusivos das séries efetivas de musculação. Não há conversão de golpes/minutos/rounds para séries, porcentagem de ativação, diferença entre lados ou recomendação quantitativa de hipertrofia. O mapa representa possibilidades mecânicas gerais, não estimativas individualizadas.

### Evidência, limitações e próximos passos
- Kirk et al. (2021), *Quantification of training load distribution in mixed martial arts athletes: A lack of periodisation and load management*, PLOS ONE, DOI 10.1371/journal.pone.0251266: duração e esforço percebido na monitorização de modalidades de luta.
- Kirk et al. (2024), *The Relationships Between External and Internal Training Loads in Mixed Martial Arts*, PMID 38134900: diferenças entre carga externa e interna em categorias técnicas e de sparring.
- O mapeamento de grupos musculares é **heurístico**, não derivado de EMG ou medição individual; por isso não há percentuais, gasto energético automático, nem recuperação muscular calculada a partir de golpes.

Verificações exigidas: testes Node de modelos/protocolos/histórico/isolamento; smoke Playwright 390px e 320px para os três blocos, persistência após reload, edição de sessão e ausência de alterações na musculação.