# NEXUS Android 0.9.0 — Núcleo de ações e pesquisa

## Melhorias do cérebro
- Unificação da entrada por voz e teclado: os dois passam pelo mesmo classificador local de intenções, com encaminhamento para a IA quando não se trata de comando local.
- Pesquisa online a pedido: tenta obter resultados públicos atuais em RSS (Bing/Google Notícias), Wikipedia e receitas (TheMealDB), quando disponível; envia resumos de fontes verificáveis ao servidor de IA e mantém links no painel. Quando nenhuma fonte está acessível, não inventa resultados.
- Distingue «abre o Google e pesquisa X» (abre navegador) de «pesquisa X e explica-me» (consulta fontes e responde na aplicação).
- Compreensão de pedidos diretos para abrir aplicações, enviar mensagens (preparação), telefonar e criar despertadores/temporizadores no relógio Android.
- Chamadas: escolhe o contacto associado ao nome/apelido uma vez pelo seletor Android; guarda localmente o número cifrado; pede confirmação para iniciar a chamada; depois pede permissão de telefone ou abre o marcador.
- Mensagens: prepara mensagens na aplicação SMS do telemóvel, com confirmação no envio. Não envia automaticamente WhatsApp ou SMS.
- Alarme/despertador: usa a app Relógio pelo intent oficial e pede confirmação nesse ecrã.
- Comandos encadeados separados por «e depois» podem ser continuados explicitamente por «NEXUS, continua».
- Memória de contexto durante a sessão ampliada de 8 para 16 entradas, incluindo respostas de ações locais. A voz foi ajustada para eliminar leituras de URLs e marcação Markdown.

## Preservado
- Holograma visual com boca animada e 3D alternativo; mãos-livres; comandos de aplicações; serviço de Acessibilidade opcional; aprendizagem de rotinas; lembretes; gestos por câmara e botão flutuante.

## Limites conhecidos
- Não é possível garantir controlo irrestrito de todas as apps. Acessibilidade pode falhar em interfaces protegidas.
- A pesquisa usa fontes públicas gratuitas, sujeitas a falha, alteração ou indisponibilidade. Não é a pesquisa integral do Google; fontes atuais só são citadas quando recuperadas.
- O NEXUS nunca lê contactos sem seleção voluntária, não coloca chamadas sem confirmação e não envia mensagens nem efetua compras autonomamente.
- A voz final depende do motor TTS instalado no Android. Não existe conversação humana perfeita nem animação facial 3D por fonemas.
- Testar fisicamente comandos, permissões, pesquisa, contactos, alarmes e modo mãos-livres antes de confiar em tarefas essenciais.
