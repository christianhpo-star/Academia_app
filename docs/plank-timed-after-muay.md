# FORJA — Prancha isométrica por tempo

## Catálogo e escolha
- `prancha-frontal` — prancha abdominal com apoio dos antebraços, 2 séries, **20–40 segundos por sustentação**, inicial **inativa** na ficha B.
- `prancha-joelhos` — alternativa com os joelhos apoiados, 2 séries de 15–35 segundos, opcional.
- `prancha-lateral` — opção lateral para oblíquos, 2 séries de 15–35 segundos **por lado**, opcional.
- As três aparecem na busca geral por "prancha" e entre as primeiras sugestões no registro de treino livre, inclusive depois de uma aula de Muay.
- São pontos de partida editáveis, não regras universais nem indicação para atingir a falha técnica.

## Modelo de dados
- O campo legado `set.reps` representa **segundos** somente nos IDs isométricos identificados por `ForjaTrainingSets.isTimed`. Essa convenção evita mudar o formato de sessões antigas. Os formulários devem exibir explicitamente "Seg (s)" ou "Seg/lado", nunca "Reps".
- Uma série só é efetiva com segundos inteiros de **5 a 300**, carga explícita válida (0 kg é permitido por serem exercícios de peso corporal) e sem sinal de aquecimento. Valor em branco, zero, não inteiro ou acima do limite não é considerado trabalho.
- **Cada sustentação completa corresponde a uma série, não a uma série por segundo.** A lateral é registrada por lado e a execução bilateral é uma única série, sem inferência de diferenças de ativação.
- O músculo principal estimado da frontal e da versão com joelhos apoiados é o reto abdominal; o da lateral é o grupo de oblíquos. O mapa muscular é esquemático, não uma medição por eletromiografia.
- O treinamento livre registra as séries no histórico de musculação sem avançar A/B/C/D. Muay continua em camada qualitativa, sem conversão de golpes em séries.

## Migração segura
`DATA.ensurePlank` adiciona somente a frontal, **inativa**, caso esteja ausente, com `plankDefaultsVersion=1` independente de `abdomenDefaultsVersion`. Não modifica exercícios editados, não duplica IDs, não toca em sessões concluídas, rascunhos ou alimentação e respeita o limite de 200. As variações lateral/joelhos ficam disponíveis no catálogo sem mudar a ficha permanente.

## Risco e recomendação
A prancha é trabalho complementar de estabilização e não substitui automaticamente exercícios dinâmicos de hipertrofia. O app sugere a duração inicial e acompanha registros, mas não aumenta automaticamente o volume geral. RIR é opcional para isométricos; o app não converte segundos em 1RM, carga ou gasto calórico.

A síntese ACSM 2026 sobre resistência aponta resposta à dose de séries semanais e retorno decrescente com aumento de volume (Currier et al., *Medicine & Science in Sports & Exercise*, DOI 10.1249/MSS.0000000000003897). A decisão individual deve considerar execução, recuperação e atividades paralelas; a ausência de registro não equivale à ausência de treino.

## Verificação
- `tests/plank-timed.test.cjs`: catálogo, migração, contagem de séries, mapa muscular, orientação e isolamento de A/B/C/D.
- `tests/smoke_plank.py`: fluxo mobile, salvamento, recuperação do rascunho, migração de arquivo antigo, histórico em segundos, mapa e ausência de transbordamento (390 e 320 px).
- Cache PWA versão 71; arquivos offline e URLs estão sincronizados com a revisão.
