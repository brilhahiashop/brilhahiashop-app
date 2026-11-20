# NEXUS Android 0.6.0 — três melhorias numa aplicação

**Corrigir abertura de aplicações**
- Usa API Android 13+ de IntentSender para tentar abrir aplicações mesmo quando a listagem de apps estiver filtrada.
- Mantém tentativas pelo PackageManager, pacote conhecido e launcher visível.
- Reconhece nomes comuns como Facebook/Face, Insta/Instagram, WhatsApp, Gmail, YouTube, Maps, TikTok, Spotify, Messenger e Chrome.
- Disponibiliza MENU → Aplicações detetadas para diagnosticar problemas de perfil duplo ou permissão.

**Holograma e interface**
- Nova camada de painéis laterais, anéis energéticos, brilho, plataforma e transições holográficas com CSS local.
- Mantém a imagem existente; não é um avatar facial 3D ou um verdadeiro holograma de realidade aumentada.

**Memória de procedimentos**
- «NEXUS, vou ensinar-te uma rotina chamada manhã» inicia o ensino.
- «Primeiro abre o Facebook», «depois pesquisa ...» grava passos sem executá-los.
- «Guarda a rotina» guarda localmente no dispositivo.
- «Executa a rotina manhã» apresenta uma revisão para confirmação. Executa um passo por vez e exige comando «próximo passo» para prosseguir.
- Apenas abertura de aplicações e pesquisas podem ser executadas diretamente; os restantes passos são orientações manuais. Não observa o ecrã nem controla automaticamente botões de terceiros.
- «Mostra rotinas» e «Apaga rotina manhã» permitem consultar e eliminar as instruções.

**Preservado**
- Servidor de IA, conversação por voz integrada, calendário e lembretes, saída segura, painel flutuante.
- As rotinas são privadas e guardadas localmente. Desinstalar a aplicação pode eliminar rotinas e lembretes locais.

**Qualificação**
- APK de pré-lançamento para teste. Requer validação no Android real para abertura de apps, serviços de voz e funcionalidades dependentes do fabricante.
