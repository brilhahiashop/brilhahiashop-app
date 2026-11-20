# NEXUS Android 0.7.0 — evolução da 0.6.1

APK experimental instalável. Mantém IA existente, interface offline, lembretes, aprendizagem local e mãos livres autorizadas até 15 minutos.

Novidades:
- Avatar 3D real, procedural e estilizado: cabeça, olhos, pestanejar, respiração, ombros e boca articulados; estados de escuta, pensamento e fala. Three.js incluído no APK. Botão para voltar à ilustração; fallback se WebGL falhar. Não é um humano fotorrealista.
- Movimento de boca aproximado, guiado pelos intervalos de fala do motor TTS quando disponíveis; alternativa animada para motores sem esses eventos. Não é lip-sync por fonemas nem captura facial.
- Conversa contínua opcional com a aplicação visível; recomeça a ouvir após a resposta e pára ao minimizar. MÃOS LIVRES é uma autorização separada para outras apps, com indicador e notificação. O reconhecimento do Android pode utilizar serviços de rede.
- WhatsApp e WhatsApp Business distinguíveis; mais variantes de pronúncia e comandos educados, como «podes abrir o Whats App por favor». Perguntas como «como abrir» não são executadas como ordens.
- Gestos experimentais MediaPipe no dispositivo: mão em movimento roda painéis; mão aberta seleciona; polegar confirma o painel. Câmara frontal visível, sem gravação/upload, encerrada ao minimizar/sair. Não confirma compras, mensagens ou ações noutras apps.
- SAIR desliga câmara, captura de voz, TTS, mãos livres, voz de lembretes e painel flutuante. Lembretes agendados mantêm notificações; depois de SAIR não retomam voz até reabrir o NEXUS.
- Corrigido reencaminhamento de comandos não reconhecidos para a IA, evitando ciclos na interface.

Validação obrigatória para publicação: compilação, testes unitários da gramática de comandos, Android Lint e testes Chromium da interface/3D. Teste em emulador é adicional; consultar o resultado específico no GitHub Actions. As permissões, deteção física das mãos, motor de voz, apps instaladas, gestão de bateria e desempenho gráfico requerem teste no telemóvel.

Ainda não inclui: controlo universal de ecrãs Android; rosto humano fotorrealista; lip-sync por fonemas; novas ligações a contas empresariais. Preserva as integrações existentes sem inventar acesso.

Instalação: descarregar APK. Em MENU > Código de acesso, usar o código privado existente do NEXUS (não uma chave OpenAI). Gestos, Conversa e Mãos Livres são opcionais e pedem autorização na app. Se o Android rejeitar a atualização por assinatura diferente, é preciso desinstalar a versão antiga; isso apaga os dados locais, incluindo rotinas e lembretes.

É um APK debug de pré-lançamento, não verificado pela Play Store. Assinatura gerada no CI. Nenhuma chave privada incluída. Apenas ficheiros do NEXUS e respetivo workflow foram alterados; BRILHAH preservada.

Componentes: Three.js 0.160.1 (MIT, licença incluída); MediaPipe Tasks Vision 0.10.21 e modelo oficial Gesture Recognizer, transferido durante a compilação e verificado por SHA-256. O APK leva o modelo integrado e não precisa de o descarregar para reconhecer gestos.
