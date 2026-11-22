# Organização das telas — P3

## Problema

O usuário apontou caminhos confusos, conteúdo repetido e excesso de informações no Início e no treino. Após a biblioteca única (PR #54) e as vistas anatômicas (PR #55), a etapa seguinte separa consulta de tendências, registro do dia e sessões anteriores.

## Decisões

- **Início:** uma ação principal de treino, recuperação recolhível, atalhos para registrar Muay Thai e alimentação, formulário diário de passos e rotina configurada. O histórico recente de passos é substituído por acesso direto à sua tendência; o último treino é consultado no Histórico.
- **Treinos:** mantém fichas, execução, Muay Thai e catálogo. A análise histórica de constância sai do caminho de finalizar a sessão. A avaliação de dose específica do treino, inclusive a opção de série extra, permanece contextual.
- **Evolução:** subabas Corpo, Treinos e Nutrição. Corpo contém peso, medidas e objetivo. Treinos reúne séries por grupo, comparação de força, passos, desempenho/recuperação e análises recolhíveis de constância e volume. Nutrição mantém as tendências existentes.
- **Histórico:** calendário único e sessões detalhadas. Os filtros Todos/Musculação/Muay Thai afetam as listas; o calendário continua mostrando ambas as modalidades. Paginação é independente por modalidade, com três registros iniciais e mais cinco por ação.
- **Ajustes:** é o destino de backup, importação e exportação. O atalho do Histórico abre diretamente Seus dados.

Não há alteração nas fórmulas de progressão, volume, metas, classificação dos registros ou participação muscular. Não há novas chaves nem migração de armazenamento.

## Navegação e acessibilidade

- Consultar, filtrar ou alternar subabas não chama persistência.
- Cada subaba de Evolução possui painel identificado e uma única seleção ativa. Setas esquerda/direita alternam; Home/End selecionam as extremidades. O foco é preservado após a renderização.
- O atalho de passos seleciona Treinos e leva ao gráfico. Lembretes de pesagem selecionam Corpo e abrem o editor, mesmo após consulta de Nutrição.
- A avaliação de joelho pendente no Início seleciona a lista de musculação e alcança uma sessão pendente, mesmo quando ela não estava entre as três primeiras.
- Ao salvar uma sessão, o Histórico volta ao filtro Todos para que um filtro anterior não esconda o novo registro.

## Critérios de aceite

1. Início mantém registro de passos, recuperação, rotina e retorno ao treino; não lista sessões nem histórico de passos.
2. Corpo não contém gráficos de passos ou volume. Treinos exibe esses gráficos e a comparação de força. Nutrição preserva suas informações.
3. Histórico permite filtrar e expandir sessões sem alterar registros, e mantém calendário de ambas as modalidades.
4. Catálogo, detalhe anatômico e navegação de abas preservam carga, repetições e RIR do rascunho, inclusive após reabrir o app.
5. Nenhuma gravação de armazenamento acontece nos caminhos de consulta exercitados.
6. Layout e controles cabem em 320, 390 e 768 px, com alvos de toque de pelo menos 44 px nos novos seletores.

## Verificação

- `tests/smoke_navigation.py`: dados sintéticos, destinos, subabas, filtros/paginação, ausência de gravações, rascunho e larguras de tela.
- Smokes existentes de nutrição, força e treino flexível atualizados somente para a localização dos indicadores; verificações de valores e ações preservadas.
- `tests/smoke_goal.py` incluído na CI para verificar o caminho de objetivo após a separação das subabas.
- Testes Node de regras/modelos, validação de recursos e demais smokes permanecem no fluxo de CI.

As capturas produzidas pelos testes contêm apenas dados sintéticos. O histórico pessoal permanece no aparelho do usuário.
