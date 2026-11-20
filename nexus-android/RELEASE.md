# NEXUS Android 0.5.1 — Correção de regressão

Corrige o bloqueio identificado na versão 0.5.0: quando o reconhecimento passava para o estado "A pensar", a interface recusava submeter o próprio pedido.

- Conversa por voz novamente enviada à IA após reconhecimento, com controlo de pedidos em curso separado do estado visual.
- Comandos locais, incluindo "abre Instagram" e "abre Facebook", funcionam também quando escritos pelo teclado.
- Reconhecimento de apps com aliases para as principais aplicações.
- "NEXUS, apresenta-te" respondido localmente, sem depender do AI Gateway.
- Saudação mostrada na interface ao iniciar e falada quando a voz Android estiver disponível.
- Voz portuguesa com tentativa alternativa e opção "Testar voz e saudação" no menu.
- Indicadores "Ouvi: ..." e mensagens de diagnóstico em erros do reconhecimento.
- Testes automáticos para a regressão de voz e comandos do teclado.
- Mantém lembretes, avatar holográfico, janelas e painel flutuante.

A versão continua a necessitar de testes no equipamento físico para volume, permissões, serviços de voz e comportamento de apps de terceiros.