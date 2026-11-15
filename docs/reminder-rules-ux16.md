# FORJA UX16 — critérios de lembretes de qualidade dos dados (15/11/2026)

## Objetivo e padrão ético

O FORJA sugere **revisões voluntárias**, não tarefas obrigatórias, diagnósticos, medidas compulsórias ou notificações push. Nunca impede treino, alimentação, evolução, backup ou leitura. Nenhum aviso modifica automaticamente calorias, macros, metas de peso, volume de treino ou medidas armazenadas. **Um lembrete não significa que o dado esteja errado.**

O painel **Hoje** preserva a primeira ação de treino e mostra no máximo **um aviso principal**; demais itens ficam recolhidos em “Outras sugestões”. Cada aviso informa *motivo*, *ação possível*, *por que surgiu*, *adiar* e *dispensar*. A configuração global fica em **Ajustes**. Os dados são avaliados localmente ao abrir a interface; **sem push, SMS, monitoramento em segundo plano ou cobrança de regularidade**.

## Gatilhos operacionais — nenhum é um ponto de corte validado

| ID | Critério observável | Ação **opcional** | Evitar inferências |
| --- | --- | --- | --- |
| `weight-check` | Dois pesos registrados, em dias distintos, com diferença ≥3% em até 3 dias | Conferir pesagem antes de interpretar o resultado | Não chamar a diferença de ganho/perda de gordura ou doença; oscilação pode refletir fluidos |
| `profile-weight` | Última pesagem datada ≥5% diferente do peso do **perfil nutricional** confirmado; suprimir na presença de `weight-check` | Rever peso usado para Mifflin e proteína g/kg | Não modificar macros, calorias nem idade automaticamente |
| `goal-nutrition` | Objetivo atual difere do objetivo do perfil que gerou uma meta `suggested` já aceita | Revisar metas se desejar | Não substituir metas manuais ou profissionais |
| `measure-review` | Circunferências registradas há ≥56 dias **ou** peso mudou ≥4% desde uma referência pesagem datada perto da medida e ≥14 dias depois | Considerar medir a mesma região e técnica novamente | Peso ≠ circunferência, gordura ou músculo; não inventar medidas |
| `bio-review` | Bioimpedância há ≥90 dias **ou** peso mudou ≥5% desde pesagem datada próxima da leitura BIA e ≥14 dias depois | Opcionalmente comparar BIA em condições semelhantes | BIA de consumo é estimativa indireta sensível a hidratação |
| `activity-review` | Fator do perfil ≥1,725 e ao menos 7 registros históricos de passos, último há ≥28 dias **ou** duas janelas de 14 dias com ≥7 dias de passos observados em cada e mudança ≥30% **e** ≥2.000 passos entre as médias | Rever atividade habitual e passo diário, se útil | Dados de passos ausentes ≠ sedentarismo; diferença não valida novo PAL; calorias de treino nunca se somam novamente |
| `profile-age` | Perfil adulto confirmado há ≥365 dias | Conferir idade, altura ou rotina | Idade não avança por estimativa automática |

**Observação:** porcentagens (3%, 4%, 5%), dias (14/28/56/90/365) e ordem de prioridades são **heurísticas de UX e qualidade do dado**. Não há estudo que valide esses gatilhos específicos como padrão clínico. O FORJA deve reavaliá-los mediante novos dados, testes de usabilidade e revisão da literatura. Os gatilhos de “peso mudou” são conservadores: exigem uma comparação datada, porém não confirmam tendência biológica. Não exibir projeção de mudança de composição corporal baseada nesses alertas.

## Regra de exibição / consentimento

1. **Nenhuma criação obrigatória:** campos vazios e ausência de bioimpedância, medidas ou passos nunca são “pendências” automáticas. Sem registros, não notificar.
2. **Máximo um destaque:** primeiro gatilho relevante após o cartão prioritário do treino, sem competir com o CTA de registrar treino.
3. **Opções acessíveis:** Conferir, Lembrar em 14 dias, Dispensar. Avisos adicionais recolhidos. Botões com área mínima de 44 px e contraste legível em tema escuro. Não usar `role=alert` nem `aria-live=assertive`.
4. **Adiar:** o mecanismo suporta 7/14/30 dias. A UI padrão oferece 14 dias. O mesmo aviso não reaparece antes do término escolhido.
5. **Dispensar:** suprime aquela condição enquanto a assinatura de contexto não mudar; não há advertência por ignorar.
6. **Desativar tudo:** `reminderPrefs.enabled=false` preserva dados e preferências e permite reativação em Ajustes.
7. **Persistência, privacidade, backup:** preferências em `state.reminderPrefs` com validação e merge preservando escolhas locais; backups legados sem essa chave continuam válidos; o arquivo de IA inclui preferências somente pelo estado já exportado localmente.
8. **Navegação direta:** a opção Conferir abre a tela correspondente e não salva/edita valores por conta própria.
9. **Sem gamificação da medição:** nunca contar “dias em atraso”, falhas ou streaks de pesagem. Não usar badge vermelho de alerta corporal.
10. **Teste com dados inteiramente sintéticos:** nenhuma captura ou valor corporal real publicado no GitHub.

## Fundamentação e limites da evidência

- **Peso diário flutua:** Schneditz et al. (2023), *Day-to-day variability in euvolemic body mass*, analisaram 9.521 dias de **um** homem saudável com medições padronizadas e encontraram desvio-padrão aproximado de 0,53% para diferenças de 1 dia. Isso ilustra flutuações, mas não fundamenta o corte de 3% ou recomendações clínicas. [Resumo no Consensus](https://consensus.app/papers/schneditz-hofmann-daytoday-variability-in-euvolemic-body-mass/w:d1aa8c5e-ae51-4a65-956a-84a151f7c6dc/)
- **BIA não é um exame definitivo de composição corporal:** Oliver et al. (2026), *The Validity of Bioelectrical Impedance Analysis Compared to a Four-Compartment Model in Healthy Adults: A Systematic Review*, encontraram variabilidade importante entre estimativas individuais. As conclusões se referem a dispositivos e populações examinadas, **não** a uma validação exclusiva do Samsung Watch. [Resumo no Consensus](https://consensus.app/papers/oliver-vecchio-the-validity-of-bioelectrical-impedance-analysis/w:da9661aa-c9ac-4360-a10a-1900c71d1206/)
- **Acompanhamento sem coerção:** evidências de engajamento em saúde digital e lembretes contextualizados indicam a importância de autonomia e carga cognitiva, mas não determinam nossa prioridade visual ou tempos exatos de snooze. [Pesquisa ampliada, com estudos e citações](consensus-ux16-research.md).
- **Acessibilidade:** MDN Web Docs — [ARIA status](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status) e [live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions). Evitar interrupção agressiva, deslocamento de foco e foco forçado em lembretes.
- **Regras anteriores de estimativas:** [auditoria UX15](evidence-audit-goals-ux15.md) e [atividade por passos](activity-factor.md). Os avisos **não validam** os fatores de atividade nem a estimativa energética.

## Casos de teste exigidos

- Histórico vazio, pesagem inicial sintética e dados incompletos não produzem notificações.
- Peso distante do perfil gera recomendação de **revisão**, não recalibração automática.
- Oscilação muito curta produz sugestão de confirmar pesagem, sem supor gordura.
- Circunferência/BIA registradas e antigas podem gerar sugestões; ausência dessas medições não pode.
- Snooze persiste após recarregar, dispense persiste enquanto assinatura não mudar; mudança de patamar pode gerar nova sugestão.
- Global desativado não exibe avisos; reativar não altera metas, treinos, alimentos nem peso.
- Backup JSON e importação preservam `reminderPrefs`; legado sem campo é aceito.
- Viewport Android 320–390 px, teclado/foco, contraste e leitores de tela devem ser verificados também no aparelho real.

## Ainda não implementado

- Regras clínicas de sintoma, condições de saúde, hidratação individual ou prescrição. 
- Calibração estatística para detectar mudanças **sustentadas** de peso usando média de sete dias ou regressão robusta. É uma evolução desejável antes de afirmar confiança na tendência.
- Integração automática com Samsung Health. As capturas e importações permanecem registros informados pelo usuário.
