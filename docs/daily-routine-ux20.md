# FORJA UX20 — Rotina diária opcional (sem notificações externas)

## Escopo entregue
A rotina permite registrar voluntariamente, pelo próprio usuário, o uso diário de **um medicamento prescrito** e **um suplemento**. A configuração e os registros ficam no estado local `dailyRoutine` do FORJA. Em **Ajustes → Rotina diária opcional**, o usuário informa os nomes, marca quais deseja acompanhar e define **horários de referência opcionais**. Nenhuma dose padrão, horário ou adesão é assumida. Para medicamentos, a configuração deve seguir a orientação do prescritor.

Depois de configurar, um cartão compacto aparece **ao abrir o aplicativo**, após o cartão de treino principal e a avaliação de joelho pendente. A confirmação `Registrei` cria um registro por item e dia, com `recordedAt` e uma cópia do nome do item naquele momento; `Desfazer` reverte a ação. Se um item já foi confirmado hoje, o nome não pode ser alterado até desfazer a confirmação, evitando transferir acidentalmente a marcação para outro medicamento. `Ocultar nesta abertura` recolhe a rotina até reabrir o aplicativo. `Desativar cartão de rotina` não apaga o histórico; reativação em Ajustes preserva as confirmações anteriores.

Não há notificação push, alerta externo, alarme confiável com o app fechado, autocorreção de doses, contagem de falhas, sequências compulsórias ou recomendação de compensação por dose esquecida. A ausência de confirmação **não equivale** a não ter tomado.

## Fronteiras de aconselhamento
- O uso informado de medicamentos/suplementos é **contexto voluntário**, nunca mecanismo de ajuste automático de calorias, treino, pressão arterial, sono ou composição corporal.
- Não inferir interação medicamentosa, melhora ou piora do desempenho, nem causalidade a partir de registros de tomada.
- Creatina não adiciona automaticamente calorias ou proteínas ao diário; pesos podem flutuar por hidratação e outras causas.
- Informações individuais sobre medicamentos, histórico e rotina podem estar no **backup JSON e no arquivo de exportação para IA**. Compartilhar apenas quando adequado, pois são dados pessoais sensíveis.
- Não inserir informações reais do usuário no repositório GitHub, logs de teste, demos ou relatórios públicos.

## Modelo local
`dailyRoutine.version=1`, `enabled`, `slots[{id,label,time,active}]`, `records[{id,date,slotId,status:'confirmed',recordedAt}]`. `medication` e `supplement` são IDs estáveis; `time` não agenda notificações. O arquivo de backup anterior, sem `dailyRoutine`, continua válido. A mesclagem preserva configurações locais já definidas e incorpora confirmações datadas ainda não presentes. Nunca altera treinos, alimentação ou metas.

## Garantias de aceitação
1. Nenhum cartão de saúde aparece para quem não ativou a rotina; há atalho discreto na página inicial e configuração em Ajustes.
2. Ao configurar, o cartão aparece ao abrir a página, com ambos os itens inicialmente “A confirmar”; não representa falha.
3. O usuário confirma individualmente, pode desfazer e ocultar, sem registro gerado ao simplesmente abrir o aplicativo.
4. Desativar e reativar não elimina os registros; ausência de registro não gera cobrança.
5. Backup local e exportação de IA incluem a rotina, com aviso explícito de privacidade; backup legado ainda abre.
6. Testes com dados **sintéticos** em Android 320, 390 e tablet 768 px, além de regressões do histórico, alimentação, treinos, Muay Thai e medidas.
7. A função **não promete** notificar quando FORJA estiver fechado. Requer implementação distinta e consentimento explícito em versão futura.

## Evidências e documentação relacionada
Consultar [auditoria científica de alimentação e objetivos](evidence-audit-goals-ux15.md) e [critérios opcionais de revisão](reminder-rules-ux16.md). Para o medicamento, seguir a bula e a prescrição individual; a rotina não substitui orientação médica ou farmacêutica. Para a creatina, o registro é apenas um apoio à consistência, não uma dose recomendada.
