# FORJA — Plano de organização da navegação e biblioteca de exercícios
**Data:** 22/11/2026  
**Natureza:** planejamento de UX e arquitetura da informação; **nenhuma alteração de código, deploy, treinamento ou dados privados**.  
**Principal objetivo:** consultar o catálogo de exercícios sem começar um treino e reduzir a repetição de ações/dados entre telas.

## 1. Diagnóstico ancorado no código atual

| Problema | Evidência atual | Efeito no uso |
| --- | --- | --- |
| Catálogo escondido no editor | `app.js:renderPlans()`: Treinos → `Editar ficha` (painel expansível) → `Catálogo` | Explorar exige entrar numa tarefa de modificação, apesar de não precisar iniciar treino |
| Biblioteca presente em três contextos | `renderCatalog()` (consulta e ativação da ficha), `renderFlexCatalog()` (sessão), `renderPlans()` (editor) | Redundância de listas, nomes e botões com consequências distintas |
| Edição e exploração misturadas | Biblioteca global mostra `Ativar na ficha` / `Adicionar à ficha` em cartões de consulta | Risco de ativar exercícios sem perceber que saiu do modo de exploração |
| Treinar e configurar concorrem por atenção | `renderPlans()` exibe seleção, iniciar e editor; `renderTraining()` exibe orientações, séries, catálogo, análises e revisão | Dificuldade de saber qual é a próxima ação |
| Informação transversal e destino pouco explícito | `renderHome()` apresenta recuperação, passos, rotinas, lembretes, histórico e atalhos; `renderProgress()` exibe indicadores e mais ajustes | Conteúdos presentes em pontos múltiplos dificultam saber onde encontrar informação |
| Navegação sem contexto persistente | `ui.tab='catalog'` é uma página oculta dentro de `Treinos`; `ui.editor`, `ui.draft`, `muayMode` influenciam a tela exibida | Transições não explicitam se o usuário está consultando, editando a ficha ou registrando a sessão |
| Biblioteca não apresenta detalhe completo independente | `renderCatalog()` mostra listagem e avisa que mapa muscular está disponível na ficha do exercício | Para ver a ilustração do exercício, usuário pode ter de entrar numa sessão |

Estas são **observações de estrutura do código**, não resultados de um estudo de usabilidade em campo. O teste atual `tests/smoke_catalog.py` também confirma a necessidade de abrir `Editar ficha` antes de clicar no catálogo independente.

## 2. Princípio da nova arquitetura
Uma função terá **um endereço principal**, com atalhos contextuais em outros lugares, sem duplicar a tela inteira. Não adicionar uma sexta aba nem remover a barra inferior já conhecida na primeira etapa.

```text
Barra principal, preservada:
INÍCIO | TREINOS | ALIMENTAÇÃO | EVOLUÇÃO | HISTÓRICO
   Ajustes: ícone do cabeçalho

INÍCIO
  Próxima ação (começar/continuar treino ou descansar)
  Checagem de recuperação e ação rápida de passos
  Atalhos leves → destinos originais

TREINOS
  [Minhas fichas]   [Catálogo]     ← ambos visíveis sem iniciar
    ├─ Minhas fichas
    │   ├─ Musculação / Muay Thai
    │   ├─ Selecionar bloco A/B/C/D
    │   ├─ Ver / editar ficha
    │   ├─ Iniciar / continuar
    │   └─ Sessão ativa: séries, carga, RIR, finalizar
    │       └─ Substituir / adicionar exercício → catálogo em modo sessão
    └─ Catálogo
        ├─ Pesquisa e filtros sem treino iniciado
        ├─ Lista completa (sem modificar fichas)
        └─ Detalhe: músculos, execução, equipamento
            └─ Ação explícita: adicionar a uma ficha (opcional)

ALIMENTAÇÃO
  Diário da data selecionada, proposta da nutricionista,
  registrar/editar/substituir refeição, macros consumidos
  Configurações de meta → Ajustes

EVOLUÇÃO
  Gráficos de peso, medidas, passos, força, volume e tendências
  Link de série histórica específica → Histórico

HISTÓRICO
  Calendário e sessões concluídas (musculação / Muay Thai)
  Revisão, edição autorizada e avaliações pós-treino

AJUSTES
  Perfil e metas, lembretes e rotina, integrações,
  backups, importação, exportação e ações sensíveis
```

## 3. Telas e responsabilidades

### Início — «O que fazer agora?»
**Manter:** recomendação ou rascunho em andamento, botão principal único, recuperação resumida, um acesso útil a passos/refeições. **Reduzir:** listas extensas, duplicação de gráfico, editor de ficha e acesso a configurações profundas. Atalhos levam à tela proprietária.

### Treinos → Minhas fichas — «O que está no meu treino?»
Ponto de entrada direto: `Minhas fichas | Catálogo` imediatamente abaixo do título e antes da seleção Musculação/Muay Thai. Somente aqui: escolher bloco, ver a programação, editar exercícios da ficha, ativar/desativar, iniciar ou retomar. Edição detalhada entra em subpágina com retorno claro; evitar uma longa lista expansível concorrendo com o botão `Iniciar`.

### Treinos → Catálogo — «Que exercícios existem?»
- **Acessível sem sessão, sem editor e sem rascunho.** Máximo de 2 toques desde qualquer aba (Treinos → Catálogo), 1 toque se já estiver em Treinos.
- Busca visível e simples; sinônimos e termos sem acento; filtros por bloco/região, equipamento e, posteriormente, músculo específico.
- Listagem com nome, equipamento, músculo e miniatura anatômica onde disponível. Sem prometer visual para exercícios não mapeados.
- Ao abrir um exercício: descrição, músculos principais/auxiliares, imagem leve, dica de execução e alternativas. **Ver detalhe não modifica ficha nem cria histórico.**
- Diferenciar `Ver exercício` (explorar) de `Adicionar à minha ficha` (alteração expressa, com escolha do bloco e confirmação). Para ativos: `Na minha ficha` e `Editar ficha`.
- Catálogo único como fonte de dados, com interface contextual, sem três catálogos desconectados.

### Sessão em andamento — «Registrar minhas séries»
Preservar na primeira dobra: exercício atual, referência da última carga, cargas/repetições/RIR, concluir série e progresso. Mapa anatômico em detalhe expansível. `Ajustar sessão` oferece **Substituir** ou **Acrescentar**, abre a mesma biblioteca em **modo de seleção contextual**, preserva o rascunho e volta exatamente para a sessão.
Na substituição, a retirada do exercício original deve ser explícita, especialmente quando já houver séries registradas; no acréscimo, manter salvaguardas atuais de volume, energia e joelho. Não colocar a busca completa permanentemente no corpo do treino.

### Alimentação, Evolução e Histórico
- **Alimentação** é a origem dos registros e das opções da receita. Exibir a meta vigente e macros; configuração permanente fica em Ajustes (com atalho para editar).
- **Evolução** é a origem de gráficos e tendências. Evitar duplicar o calendário ou listas integrais de sessões; um toque abre o item no Histórico.
- **Histórico** é a origem das sessões passadas e do calendário. Mostrar detalhes recolhíveis, sem refazer gráficos da Evolução.
- **Ajustes** concentra metas, lembretes e dados; remover links profundos duplicados quando oferecerem a mesma configuração.

## 4. Estados e rotas — implementação futura, sem migração de dados
A navegação atual usa `ui.tab`, `ui.editor`, `ui.draft` e `muayMode`. Preferir um **estado transitório de interface** independente do armazenamento de treino:
- `ui.tab='plans'`, `ui.plansView='my-plans'|'catalog'`.
- `ui.catalogContext='browse'|'plan-add'|'session-replace'|'session-add'`.
- `ui.returnTarget` guarda a origem, exercício/bloco e posição de rolagem; `ui.draft` continua intocado ao consultar a biblioteca.
- Separar `browseExercise(id)` de `activateExercise(id)` e `addToSession(id)` no fluxo de ações. Não confundir ler dados com gravar.
- Manter compatibilidade de destinos internos atuais (incluindo `ui.tab='catalog'` em atalhos antigos) por adaptador, com fallback que não abandona rascunhos.
- Considerar URL e `history.pushState/replaceState/popstate` somente com testes Android/PWA para botão Voltar; não usar `history.state` para guardar séries ou dados pessoais.

## 5. Fases e critérios de aceite

| Fase | Escopo | Critério |
| --- | --- | --- |
| P0 — acesso imediato | Aba Treinos mostra `Minhas fichas | Catálogo` sem expandir `Editar ficha`; aba Catálogo não chama início de treino | Catálogo em até 2 toques de qualquer aba; sem mudança de dados ao explorar |
| P1 — tela de detalhe | Biblioteca com detalhe independente e mapa anatômico quando disponível | Voador inverso consultável sem sessão; sem obrigatoriedade de ativar na ficha |
| P2 — biblioteca única contextual | Unificar fonte/rotina de seleção, simplificar lista de substituições durante o treino | Retorno ao exercício e rascunho preservados, substituição e acréscimo diferentes |
| P3 — redistribuição | Início mais curto; Evolução, Histórico, Alimentação e Ajustes com responsabilidades exclusivas | Mesma configuração tem um proprietário e atalhos corretos, sem tela duplicada |
| P4 — QA/revisão | Verificação manual e Playwright no Android/PWA | Passar todos os testes existentes + testes de navegação, busca, foco, voltar, responsividade e persistência |

### QA prioritária
1. Navegação para `Catálogo` **sem iniciar treino**, sem entrar em `Editar ficha`, sem criar/chamar `localStorage.setItem` para a mera consulta.
2. Busca por `voador inverso`, `peck deck inverso` e `supino canadense`; filtros não escondem indevidamente resultados.
3. Detalhe de exercício mostra a classificação certa sem dados anatômicos inventados.
4. Abrir catálogo a partir de uma sessão com 2 séries preenchidas; voltar e conferir valores, RIR, plano e foco **exatamente preservados**.
5. Escolher `Adicionar à ficha` exige intenção explícita e pode ser cancelado sem efeito colateral.
6. Em uma substituição, não marcar automaticamente o original como concluído; séries já lançadas não desaparecem.
7. Navegação e botão Voltar funcionam a 320, 390 e 412 px, inclusive sem internet após instalação; navegação teclado e foco visíveis.
8. Testes de recuperação de histórico e importação/backup JSON seguem íntegros; nenhuma migração de dados necessária.

## 6. Análise de risco
**Prioridade absoluta:** o histórico local não pode ser perdido. Nenhuma alteração de arquitetura deve trocar chaves de `localStorage`, recriar estado inicial silenciosamente, recalcular consumos passados ou remover dados de rascunhos. Implementar mudanças primeiro numa branch, registrar capturas Playwright e publicar só com CI verde e revisão da navegação móvel.

## 7. Insumos
- Inspeção direta do código atual do repositório `christianhpo-star/Academia_app` (funções `renderHome`, `renderPlans`, `renderCatalog`, `renderFlexCatalog`, `renderTraining`, `renderProgress`, `renderHistory`, `renderSettings` e `tests/smoke_catalog.py`).
- Fluxo projetado no UX Pilot (prévia de diagrama disponível nesta conversa; geração hi-fi não iniciou por erro do serviço).
- Context7 / MDN: navegação semântica e `aria-current` (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current); History API (https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API).
