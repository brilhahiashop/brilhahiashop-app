# NEXUS JARVIS Android 1.2.0 — versão independente

A aplicação usa o identificador `pt.nexus.jarvis`, separado de `pt.nexus.assistant`.

O workflow `.github/workflows/nexus-jarvis-build.yml` compila `nexus-jarvis` com Java 17, Gradle 8.9 e Android SDK 34.

O APK é uma compilação **debug experimental**. Ainda não houve testes no telemóvel físico nem validação do serviço externo de IA ou de todas as permissões.

O modo “Mãos livres” nesta versão é uma sucessão de sessões de reconhecimento enquanto a aplicação está ativa; não constitui um serviço independente de escuta em segundo plano.
