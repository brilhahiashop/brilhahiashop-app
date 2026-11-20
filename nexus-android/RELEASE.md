# NEXUS Android 1.2.0 — Holograma vivo e mãos livres integrado

## Novidades implementadas
- O antigo canvas `photoRig.js` deixa de carregar. Não há mais boca falsa desenhada fora da face. O 3D estilizado também deixa de ter animação labial artificial.
- O holograma completo reage aos estados ouvir, pensar, pesquisar e falar, com anéis, luz pulsante e um visualizador de energia de voz sem boca solta.
- Mensagem de entrada apresentada na interface quando esta abre. Saudação por voz quando a síntese Android está pronta.
- HUD holográfico apresenta o progresso da pesquisa, as fontes reais e a resposta recebida; o texto avança progressivamente durante a fala. Um toque expande o resultado e permite consultar todas as fontes.
- Mãos livres autoriza uma sessão: quando a aplicação está aberta, conversa contínua; em segundo plano, o serviço autorizado com notificação e wake word NEXUS/Nexos/Anexos. Se o Android impedir abrir uma aplicação no fundo, a notificação serve para retomar o pedido.
- Mantidos pesquisa pública, alarmes, chamadas com confirmação, mensagens preparadas, aprendizagem local, operador de acessibilidade autorizado e comandos de aplicações.

## Limitações reais
- A animação usa retrato 2.5D e efeitos de luz, não é uma face 3D com lip-sync de cinema.
- A pesquisa é de melhor esforço em feeds e fontes públicas, sem acesso universal a toda a Web.
- O reconhecimento contínuo pode ser interrompido pelo Android, pelo serviço de voz ou pelo consumo de bateria; não existe controlo ilimitado sobre aplicações.
- As permissões do Android exigem autorização do utilizador. Não são concedidas automaticamente.
- O APK é uma versão de teste assinada com chave debug da compilação. A atualização direta da 1.1 poderá falhar se a assinatura diferir; não desinstales sem preservar primeiro dados locais importantes.
- Testes automatizados não equivalem à validação de microfone/gestos/contactos em telemóvel físico.

## Como usar
- No início, vê a saudação e toca no holograma/botão central para falar.
- O menu superior permite ativar mãos livres (microfone e mostrar sobre outras apps precisam de autorização explícita), conversar, gerir tarefas e sair.
- A faixa holográfica roda para a função solicitada; toca numa opção lateral para a selecionar ou na central para executar.
- Toca no resultado para expandir, ler e abrir fontes reais.
