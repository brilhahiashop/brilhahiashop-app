# JARVIS CENTRAL 1.7 — email e notificações
A integração Gmail usa AuthorizationClient de Google Play Services, não pede palavras-passe, e não guarda tokens de acesso permanentemente. Cada uma das três contas tem consentimento individual. Os dados lidos permanecem no telemóvel e não entram em prompts do motor de IA.

## Requisitos para ativar
1. Criar/configurar projeto Google Cloud com Gmail API ativada.
2. Configurar ecrã de consentimento e autorizações restritas gmail.readonly; gmail.modify apenas para mover emails ao Lixo.
3. Criar cliente OAuth Android para pacote pt.nexus.jarvis.mail e impressão SHA-1 da assinatura efetiva desta compilação. O pacote deve ser devidamente registado e autorizado. Se não for, o Google recusará a ligação.
4. Se aplicável, submeter o ecrã de consentimento a verificação Google para escopos restritos. Não adicionar credenciais ao código nem ao GitHub.
5. Em JARVIS CENTRAL, ligar até 3 contas, uma de cada vez, com autorização Google.
6. Opcional: ativar agendamento de lembretes de possíveis faturas no painel Email. Agendamentos são avisos de verificação; NUNCA executam pagamentos.
7. Separadamente, Android > Definições > acesso às notificações > autorizar NEXUS para contar notificações sociais.

O app não lê contas Outlook/Yahoo via Gmail API. Notificações sociais representam notificações atualmente ativas no Android, não mensagens não lidas reais.
O texto completo de um email só é carregado quando se seleciona "Ler"; promoções e spam são apenas sugeridos para revisão, nunca apagados sem confirmação.
