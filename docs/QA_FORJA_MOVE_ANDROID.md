# FORJA MOVE — homologação no Android (vídeo local)

**Estado:** procedimento para o PR #27. O teste automatizado simula um celular Chromium, mas **não substitui** o teste físico no aparelho. Não é necessário apagar nem desinstalar a versão atual. Antes de atualizar uma PWA real, exporte seu backup em **Ajustes**.

## Pré-condições

- A versão com **FORJA MOVE v5** deve estar disponível em **HTTPS**. O código em PR de rascunho **não está automaticamente publicado no GitHub Pages**.
- No aparelho, usar Chrome/Chromium atualizado, com espaço livre suficiente. Evitar modo anônimo, que não oferece retenção confiável.
- Baixar um MP4/WebM que você criou ou tem permissão para utilizar. Para testar o mecanismo sem confundir com execução correta, usar o **vídeo sintético FORJA — TESTE DE VÍDEO** fornecido nesta conversa.
- Se o aplicativo já estiver instalado, **não limpar dados do site** e não trocar de domínio/origem. O IndexedDB fica associado à origem (domínio + esquema). Reinstalar ou migrar de domínio pode impedir acesso aos vídeos antigos.

## Sequência de teste e critérios de aceite

- [ ] **Abrir catálogo:** Treinos → Catálogo → Supino canadense → **Ver demonstração**. O modal exibe nome correto, botão **Fechar** e, quando houver, link externo ao produtor.
- [ ] **Selecionar MP4:** Adicionar vídeo local MP4/WebM → escolher arquivo autorizado → aguardar **Vídeo disponível neste dispositivo**. Controles de reprodução aparecem; reproduzir e pausar. O vídeo não deve abrir outra aba.
- [ ] **Preservar registro:** fechar o modal, voltar à ficha e confirmar que as séries/cargas/rascunho não foram alterados.
- [ ] **Persistência:** fechar completamente o aplicativo e reabrir. Abrir o mesmo exercício: o vídeo continua disponível.
- [ ] **Offline:** com a PWA já aberta e cache atual instalado, ativar modo avião, fechar e reabrir o aplicativo. Abrir o mesmo exercício: o vídeo reproduz sem internet. O link do produtor pode não abrir, o que é esperado.
- [ ] **Isolamento:** abrir outro exercício não associado àquele vídeo. Ele não deve mostrar o clipe importado para supino canadense.
- [ ] **Remoção:** usar **Remover vídeo salvo**. Confirmar que não aparece mais ao reabrir o exercício, inclusive depois de reiniciar a PWA.
- [ ] **Acessibilidade:** repetir o fluxo em orientação vertical, fonte do sistema ampliada e com recursos de redução de movimento, observando rolagem sem cortes.
- [ ] **Armazenamento:** conferir que ao limpar dados do navegador/armazenamento da PWA **os vídeos poderão ser perdidos**. Não limpar de fato se houver dados pessoais; esta observação não exige executar uma exclusão.

## Evidências e limites

Registrar modelo/versão de Android, navegador, URL/versão testada, tamanho/codec do vídeo, status de cada item e uma captura do modal sem dados sensíveis. Arquivos de vídeo **não estão incluídos no backup JSON** de treinos. Vídeos do usuário ficam no IndexedDB local e não sincronizam entre aparelhos. O modo avião só é aceito depois do primeiro carregamento com o service worker atualizado.

Em caso de falha, não fazer merge do PR #27. Relatar no próprio PR com evidência e versão. O motor de animações SVG anterior (#22) permanece separado.
