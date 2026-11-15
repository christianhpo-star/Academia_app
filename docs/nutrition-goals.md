# Diário alimentar e metas — issue #17

A alimentação passa a ter acesso direto na navegação. O catálogo de exercícios fica acessível em Treinos. O diário usa a data selecionada em todos os fluxos e agrupa café da manhã, almoço, lanche, jantar e ceia. Registros antigos `other` não são reclassificados.

## Contratos e conservação de dados

- Mesmas chaves de armazenamento; `nutrition` mantém schemaVersion 1 com campos opcionais retrocompatíveis.
- `fiberG` ausente significa desconhecido. Energia/macros de estimativas de baixa confiança continuam separados dos totais observados. Não há conversão implícita ml→g.
- `nutrition.draft` guarda entrada, ID original opcional e campos manuais ainda incompletos. Só salvar a refeição cria consumo. Exportação JSON inclui o rascunho; importação prioriza o rascunho atual.
- `settings.profile` contém altura, idade confirmada, peso, sexo usado pela equação, atividade, objetivo, declaração de escopo e data de confirmação. Nenhum perfil real é embarcado.
- `settings.targets` armazena versões com ID, início de vigência, origem, valores, perfil usado e versão de fórmula. Datas anteriores à atual não podem ser alteradas pelo editor. Para conflitos de importação, a meta local da mesma data tem prioridade.
- Falhas de armazenamento fazem rollback do estado; editor continua aberto. Favoritos e repetição abrem revisão; editar entradas compostas preserva IDs e snapshots.

## Modelo explicável

Mifflin–St Jeor estima repouso, não gasto total medido: `10*peso + 6.25*altura - 5*idade + constante`, +5 masculino ou −161 feminino. Sem parâmetro informado ou dados completos, somente metas manuais. Escopo automático limitado a adultos que declaram não precisar de plano clínico específico.

Fator de atividade selecionado considera rotina e treinos juntos: 1,2 / 1,375 / 1,55 / 1,725 / 1,9. Estes cenários são aproximações de produto; não somar gasto de exercícios novamente. Recomposição e manutenção começam em manutenção estimada; redução de gordura em −10%; ganho em +5%. São hipóteses iniciais editáveis, não limiares de eficácia garantida. O prazo de peso não força déficit agressivo.

Proteína inicial: 1,8 g/kg (referência bibliográfica 1,6–2,2 para treino resistido). Gordura inicial: 25% das kcal (referência 20–35%). Carboidrato: saldo com aproximação 4/4/9; saldo inválido bloqueia sugestão, e <3 g/kg gera observação contextual sobre treinos exigentes. Fibra: 25 g/dia como referência mínima adulta. Estes valores não são prescrições universais. Energia de rótulos não é recalculada por 4/4/9.

A interface mostra contexto de força/Muay, número de medidas, pesagens recentes e variação de peso quando há intervalo mínimo de 14 dias. Não calcula percentual de gordura por circunferências, não diagnostica déficit por fadiga e não aumenta/diminui metas automaticamente. Revisão de 2–4 semanas é uma janela operacional. As metas manuais permanecem protegidas e a sugestão exige aceitação explícita.

## Evidências

Consultadas no planejamento em 15/11/2026; Context7 `/mdn/content` fundamentou diálogo nativo, foco e cancelamento, não as regras nutricionais.

- Mifflin et al. (1990), DOI 10.1093/ajcn/51.2.241: https://pubmed.ncbi.nlm.nih.gov/2305711/
- ISSN (2026), publicado online 13/10/2026, DOI 10.1080/15502783.2026.2740266: https://pubmed.ncbi.nlm.nih.gov/42867412/
- Morton et al. (2018), DOI 10.1136/bjsports-2017-097608: https://pubmed.ncbi.nlm.nih.gov/28698222/ (média populacional não determina necessidade individual).
- AND/DC/ACSM (2016), DOI 10.1016/j.jand.2015.12.006: https://pubmed.ncbi.nlm.nih.gov/26920240/
- OMS (2023), qualidade de carboidratos e fibras: https://www.who.int/publications/b/69157
- NIDDK, contexto de planejamento de peso: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner (sem integração com o simulador).

## Validação

`node --test tests/*.test.cjs`, `python3 tests/check_assets.py`, testes Playwright no workflow. Fixtures sintéticas cobrem metas, vigência, campos faltantes, fibra desconhecida/zero, ceia, edição composta, data contextual, rascunho, favoritos, falha de quota e responsividade. Testar também instalação real no Android para teclado virtual e Voltar.
