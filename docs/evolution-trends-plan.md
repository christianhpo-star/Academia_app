# FORJA — Plano de UX: passos, frutas e aba Evolução

Data de referência: 15/11/2026. Referência: screenshots e navegação atual do FORJA. Alterações no GitHub exigem CI e validação de PWA.

## Diagnóstico

1. Passos estavam em Alimentação → Minhas metas → painel de atividade: dado diário escondido em configurações, embora seja usado para interpretação do volume habitual de atividade.
2. Frutas existentes: banana-prata, maçã Fuji, mamão Formosa e banana genérica de referência, sem navegação por categoria. Catálogo grande exige busca ou rolagem.
3. Radar de força é uma medida relativa entre poucos grupos, normalizando por exercício; ocupa área principal sem indicar diretamente evolução da recomposição.

## Entrega na versão atual

- **Início:** cartão logo após o treino principal com data, total de passos de hoje, edição do dia e histórico recente. A linha de hoje não preenchida é «não informado», diferente de zero; não enviar notificações externas ou mudar metas sem confirmação. A entrada usa ACT.upsertSteps e guarda activitySteps no backup.
- **Alimentação:** 14 frutas de TACO 4ª edição acrescentadas às quatro já registradas (18 no total), com fonte, gramas comestíveis e filtro Frutas no seletor de refeição. Não converter peso bruto com casca ou semente em 100% parte comestível.
- **Evolução:** peso registrado e gráfico original continuam; circunferência de abdômen (umbigo) em tendência temporal quando há pelo menos dois pontos; passos diários em períodos de 7/14/28 dias, pontos ausentes exibidos com lacunas; top 3 variações de força calculadas por exercício (não somar kg de máquinas diferentes); radar original recolhido em análise avançada. A meta de peso continua manual e é apenas referência visual.

## Fase seguinte (não incluída nesta entrega)

- **Peso:** médias móveis 7 dias apenas quando houver cobertura suficiente, comparação por blocos de 2 a 4 semanas, explicitar variação diária, sem projetar perda linear.
- **Medidas:** seletor de abdômen, quadril, braços e peito; filtros de datas, comparação do mesmo local e técnica; não deduzir percentual de gordura pela circunferência.
- **Força:** linha por exercício de carga, repetições e RIR comparáveis, com anotações de substituição de equipamento e volume de séries efetivas; evitar percentuais enganosos quando há poucos pontos ou exercícios distintos.
- **Atividade:** correlação descritiva de passos e treinos, mas sem inferir calorias gastas nem chamar dia sem registro de inatividade; conexão Samsung Health depende de implementação própria, autorização e validação.
- **Nutrição:** cobertura diária dos alimentos anotados e média de proteína/energia apenas para dias efetivamente lançados; não classificar ausência como dieta descumprida; não compensar automaticamente por exercícios.
- **Resumo de tendências:** mensagens condicionais prudentes em caso de série suficiente; não usar badges que diagnostiquem recomposição por uma pesagem, BIA isolada ou mudança de carga.

## Critérios de aceite

1. No celular (320/390 px), passos são digitados da tela inicial sem abrir Metas; edição do mesmo dia não duplica, e falha ao persistir não apaga valores anteriores.
2. Frutas encontráveis pelo botão Frutas e pela busca por nome/sem acento; 121,5 g calculados em proporção; rótulos com origem identificada.
3. A aba Evolução abre com radar fechado; gráficos mantêm dias sem informação distintos de zero; rótulo «Abdômen (umbigo)» corresponde ao esquema existente.
4. Abrir radar avançado continua permitindo seu drill-down e navegação por teclado. CI do navegador e testes unitários completos precisam ficar verdes antes de integrar à principal.
5. Publicação deve atualizar versão de assets e Service Worker; dados pessoais não entram no código-fonte público.

Referência nutricional das novas frutas: NEPA/UNICAMP, *Tabela Brasileira de Composição de Alimentos* (TACO), 4ª ed., 2011: https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf
