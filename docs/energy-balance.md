# FORJA — Equilíbrio calórico opcional, revisão por semana

Implementação inicial (2026-11-16). **Ferramenta de acompanhamento, não prescrição alimentar, não conselho para compensações obrigatórias.**

## Fundamentação e limites da evidência

- O objetivo não é punir refeições de maior consumo; aderência a uma estratégia alimentar sustentável e energia suficiente para atividade e recuperação são mais importantes que compensar pontualmente cada caloria.
- AND/DC/ACSM, *Nutrition and Athletic Performance* (2016), DOI: https://doi.org/10.1016/j.jand.2015.12.006 — desempenho depende da adequação energética e dos nutrientes, individualizados.
- Morton et al. (2018), meta-análise proteína e treino resistido, DOI: https://doi.org/10.1136/bjsports-2017-097608 — fundamenta evitar sacrificar ingestão de proteína; não determina um valor universal.
- Jäger et al., ISSN Position Stand: Protein and Exercise (2017), DOI: https://doi.org/10.1186/s12970-017-0177-8 — contexto da proteína para quem treina.
- IOC consensus sobre REDs (2023), DOI: https://doi.org/10.1136/bjsports-2023-106994 — atenção à baixa disponibilidade energética; o produto **não** diagnostica REDs.
- Mifflin et al. (1990), DOI: https://doi.org/10.1093/ajcn/51.2.241 — estimativa de gasto basal, não medição de necessidade individual.
- **Não há consenso universal** que determine reduzir 200 kcal por dia, exigir três dias conferidos, usar sete dias móveis, reduzir carboidratos em até 15% ou aplicar limite de 8% das calorias. São parâmetros **prudenciais heurísticos deste produto**, ajustáveis ou revisáveis, nunca limiares clínicos.

## Entrada dos dados e confidencialidade

- Janela: **sete dias anteriores à data atual**, com seleção explícita do usuário.
- Um dia só entra no saldo quando o usuário confirma: "Conferi todas as refeições, bebidas e quantidades que consumi neste dia". A confirmação é restrita a dias encerrados.
- Não permite confirmação de dia com quantidade desconhecida, macronutrientes ausentes ou estimativas de baixa confiança. Exemplo: Trono dos Reis com foto, sem pesos medidos, não deve gerar cortes futuros automaticamente.
- Cada confirmação guarda data, data da revisão e impressão de conteúdo. Quando uma refeição ou ingrediente é editado, retirado ou adicionado, o estado "conferido" torna-se obsoleto; planos que dependem desse dia param de ser aplicados.
- A impressão é apenas um detector de alteração local (não autenticação nem hash criptográfico). Dados pessoais ficam no aparelho e no backup JSON escolhido pelo usuário.

## Algoritmo v1

1. Buscar meta ativa **original** em \`nutrition.settings.targets\`. Bloquear quando houver meta profissional, perfil não confirmado, idade fora de escopo, macronutrientes incoerentes ou meta de manutenção/ganho.
2. Acessar até sete dias anteriores, contar somente dias conferidos, completos, com a mesma meta ativa. No mínimo três dias; essa contagem é um *filtro heurístico* que não certifica que a semana inteira foi registrada.
3. \`saldo = soma(energia registrada - meta energética original)\`, **somente entre os dias conferidos**. Não representa balanço energético fisiológico; nunca preencher dados ausentes como zero.
4. Propor **nenhum ajuste** se saldo inferior a 150 kcal ou quando nenhum dos dias conferidos exceder de modo relevante a manutenção **estimada** (\`G.estimate(profile).maintenance + 100 kcal\`). O excedente sobre a meta já restrita não é, sozinho, um superávit.
5. Não propor cortes se pelo menos um dos dias conferidos teve proteína registrada inferior a 85% da meta, se há incoerência macroenergética, ou se o perfil não sustenta os mínimos de energia/carboidrato. Esses filtros são conservadores, **não gatilhos clínicos**.
6. Exibir um **plano opcional** para **1 a 5 datas**, escolhidas pelo próprio usuário entre os próximos sete dias, declaradas como *leves ou de descanso*. Ausência de treino no histórico **não comprova** descanso. Treino real registrado em dia planejado suspende o corte desse dia.
7. Limitar por dia a menor entre 200 kcal, 8% da meta original, 15% dos carboidratos da meta original, limite residual de 2 g/kg/dia de carboidratos e energia acima do gasto em repouso estimado. Sem margem para ao menos 40 kcal de ajuste, não sugerir nada.
8. Preservar proteína, gorduras e fibras **em gramas**. Deduzir energia unicamente da parcela de carboidratos, pela aproximação de 4 kcal/g. Isso não garante adequação de micronutrientes: o usuário mantém alimentação variada.
9. Não impor recomposição integral; não gerar "dívida" infinita. O total não compensado é exibido como informação, sem obrigação de ajuste.
10. **Só aplicar após confirmação explícita**. Guardar plano em \`nutrition.balance.plan\`, sem modificar \`nutrition.settings.targets\` ou refeições. Um plano aprovado é exibido como meta temporária; alterações relevantes de perfil, meta ou refeições invalidam a proposta.
11. Controles: cancelar plano, manter meta normal por sete dias ou voltar a avaliar. Nenhum ajuste automático retroativo ou atribuição de calorias extras a exercício.

## Interface

Na alimentação, o bloco compacto "Equilíbrio calórico · 7 dias" mostra status, saldo **parcial**, revisão dos últimos dias, oferta opcional e cancelamento. Ao aprovar, a meta exibida na data escolhida recebe rótulo **temporário**, com meta original explicitada. Em dias com treino registrado, aplica-se a meta original.

## Segurança, implantação e testes

- Backup e restauração retrocompatíveis com \`schemaVersion: 1\`; novo campo \`nutrition.balance\` opcional.
- Validação de registros, escolhas, datas e planos em \`nutrition.js\`; mesclagem prioriza escolhas locais e preserva revisões adicionais do backup.
- Testes unitários e Playwright cobrem ausência de registros, estimativas de baixa confiança, proteína, metas profissionais, mudanças em refeição, alvo e perfil, treino e persistência no celular.
- Testes sintéticos não representam a alimentação individual do usuário. A distribuição não foi validada prospectivamente para emagrecimento, manutenção de massa ou desempenho.

**Próxima revisão clínica/de produto:** verificar aderência e efeitos observados, ajustar redação sobre incertezas e garantir que nenhum padrão de consumo frequente/compensação desproporcional incentive alimentação restritiva.
