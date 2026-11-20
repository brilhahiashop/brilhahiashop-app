NEXUS 0.4.0 — APK experimental instalável.

Interface e avatar incluídos no APK, carregados por origem HTTPS local sem depender do site. Voz nativa Android com saudação; reconhecimento após toque; pedidos autenticados ao servidor existente, com histórico da sessão e pesquisa. Código de acesso cifrado no Android Keystore, nunca incluído no APK. Painéis com rotação e navegação por toque. Botão flutuante existente preservado. Minimizar interrompe voz e pedidos. Sair remove também o serviço e sensor.

Validação antes da publicação: compilação, Android Lint e teste instrumentado Android 35 de abertura offline, imagem local, ponte nativa, navegação de painéis, recarregamento e estado de paragem.

Limitações: avatar ilustrado animado, sem modelo facial 3D nem lip-sync real; sem gestos por câmara; sensor de proximidade experimental existente. Sem escuta contínua em segundo plano. Sem novas integrações de contas empresariais. Motor remoto requer código privado existente e serviço disponível. Servidor validado com resposta autenticada e meteorologia com dados estruturados. Fala, reconhecimento, intents e overlay exigem validação no telemóvel. O histórico desta sessão não sincroniza entre dispositivos.

Primeira utilização: abrir o APK, autorizar instalação se solicitado, introduzir o código privado do NEXUS em MENU > Código de acesso. Não inserir chave OpenAI. Para o botão flutuante, autorizar Mostrar sobre outras apps e tocar novamente em FLUTUANTE. É necessário um motor de voz Android com voz portuguesa. O botão VOZ utiliza o serviço de reconhecimento do Android, cuja política de dados depende do fornecedor.

APK debug: assinatura de teste gerada no CI. Pode ser necessário desinstalar a versão anterior antes de instalar; isso apaga os dados locais. Não é versão verificada pela Play Store. Não foram alterados ficheiros da BRILHAH.
