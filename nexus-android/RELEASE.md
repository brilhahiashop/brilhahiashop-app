# NEXUS Android 0.8.0

## Preservado de versões anteriores
- Aplicação local com holograma, conversa por voz, IA Vercel, pesquisa, lembretes, Mãos Livres opt-in, aprendizagem de rotinas.
- Avatar 3D estilizado em Three.js (opcional) e reconhecimento de gestos via MediaPipe com câmara frontal visível e autorização.
- Botão flutuante, abertura de aplicações, variantes de voz do WhatsApp.

## Novo nesta versão
1. **Modo rosto realista:** imagem holográfica de alta definição com animação local de lábios alinhada com o início/fim da fala e, quando existirem, intervalos de TTS. Transições de profundidade e modo alternativo 3D. Não é um modelo facial fotorealista 3D com fonemas certificados.
2. **Operador Android opcional:** serviço de Acessibilidade com permissão explícita nas Definições. Comandos: "NEXUS, volta atrás", "NEXUS, desce", "NEXUS, toca em pesquisar" e "NEXUS, escreve olá" (sem enviar).
3. **Interface funcional:** os painéis laterais do holograma tornam-se botões reais para aplicações e lembretes. Botão OPERADOR abre instruções de autorização. Painel flutuante simplificado com ações reais.
4. **Privacidade:** ações locais e por iniciativa do utilizador, sem persistir conteúdo dos ecrãs. Não são automatizados envios de mensagens, compras, transferências, eliminações ou aceitação de permissões.

## Limitações e testes
- Acessibilidade pode não conseguir interagir com alguns ecrãs protegidos ou interfaces específicas; só funciona após ativação voluntária.
- A animação de lábios é aproximada, não reconstrução facial 3D por fonemas.
- A escuta no segundo plano permanece dependente das restrições Android e do motor de voz.
- Verificar manualmente no equipamento: whatsapp, voz, fotos, opções de acessibilidade e restrições de bateria.
- As permissões da câmara e microfone não são necessárias para abrir a aplicação; pedidas quando a função é ativada.
