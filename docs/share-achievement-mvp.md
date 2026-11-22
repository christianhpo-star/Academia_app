# Compartilhar conquista — MVP local (Instagram Sticker)

Implementação da Issue #62: arte PNG de fundo transparente gerada apenas no aparelho, para ser sobreposta a uma foto postada pelo próprio usuário no Instagram. Não requer login, API do Instagram, edição da foto nem upload do histórico.

## Acesso

Após concluir o treino, o FORJA abre o Histórico e oferece "Compartilhar conquista" para a sessão recém-salva. Qualquer sessão salva no Histórico possui a mesma ação. O editor é uma aba temporária sem gravar preferências no localStorage.

## Conteúdo

- Três variantes: Conquista, Músculos e Destaque, com frase editável, frente/costas, modo claro/escuro e campos opcionais.
- Maior carga: maior número de carga externa numa série válida efetivamente executada, sem aquecimentos. Desempates por repetições e ordem original. Não é recorde pessoal nem intensidade comparável entre aparelhos. Cargas kg e kg/halter preservam a unidade original. É possível escolher outro exercício da sessão.
- Ausência de carga: cardio informado, constância semanal comprovada ou "Treino concluído", sem inventar calorias, duração, recordes ou métricas.
- Mapa de músculos: somente séries executadas na sessão escolhida, e não o acumulado de 7/30/90 dias. Cobertura parcial é identificada. Escada possui participação complementar distinta, sem gerar séries.
- Constância: dias distintos com treino registrado de segunda-feira até a data daquela sessão.
- Sem peso corporal, alimentação, notas privadas, dor e outros dados sensíveis. Não usa nem armazena fotos.

## Exportação

PNG 1080 x 880 px, bordas e áreas externas transparentes (alpha=0), superfícies internas translúcidas para legibilidade. Salvar PNG funciona por download do navegador. Copiar imagem é oferecido se ClipboardItem e navigator.clipboard.write estiverem disponíveis; compartilhar arquivo requer Web Share API com suporte a arquivos. Nenhuma dessas ações publica automaticamente no Instagram.

No Instagram Stories: tirar/escolher foto, abrir figurinhas e buscar opção de inserir uma imagem da galeria, se houver. Esse fluxo ainda precisa ser validado com Android e Instagram instalados; o recurso Cutouts pode recortar o PNG e eliminar letras ou alterar o formato. Não afirmar compatibilidade plena até a validação no Samsung físico.

## Testes e QA

Motores separados share-summary.js e share-sticker.js, testes de regras Node, teste de navegador Playwright com sessões sintéticas, comparação de tela 320/390/412/768 px, PNG com canal alfa e histórico intocado. Arquivos integrados ao cache offline e CI de publicação.

**QA físico pendente:** sobrepor uma figurinha a uma foto real no Story do Instagram no Samsung. A geração do PNG pode funcionar mesmo que o Instagram não aceite sua colagem como sticker.

## Fora do MVP

Postagem automática, login Instagram, edição da foto no FORJA, recordes automáticos não validados, figurinhas Muay Thai, configurações permanentes e comparação de cargas entre aparelhos.
