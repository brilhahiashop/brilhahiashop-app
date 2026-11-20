# NEXUS Android 1.0.0 — Pesquisa universal experimental + Holograma interativo

## Novo retrato e interação
- Retrato holográfico local atualizado a partir da referência visual fornecida pelo utilizador. A fotografia está incorporada no APK; não depende da Internet.
- Faixa de sete opções holográficas com aparência de profundidade: FALAR, APPS, PESQUISA, AGENDA, APRENDER, OPERADOR e SISTEMA.
- Toca na opção central para executar; desliza ou usa as setas para selecionar. Os gestos por câmara já existentes também podem deslocar a seleção, com confirmação para executar.
- A função correspondente ao pedido é destacada visualmente.
- Resultados apresentados numa janela holográfica compacta, expansível; deixa parte do avatar visível em vez de ocupar todo o ecrã.
- Remoção de textos decorativos de diagnóstico sem utilidade.
- Mantém animação de boca aproximada durante a fala e alternativa 3D estilizada. Não é reconstrução facial 3D fotorrealista.

## Pesquisa online
- Pesquisa genérica em várias fontes públicas em paralelo, com prazo global de aproximadamente 6 segundos.
- Fontes disponíveis conforme o tema: resultados públicos Bing RSS, Google Notícias RSS, Bing News RSS, Wikipédia e receitas TheMealDB.
- Fontes são apenas apresentadas se efetivamente recuperadas; uma pré-visualização aparece antes da síntese final da IA.
- Perguntas atuais e factuais passam mais frequentemente pelo módulo de pesquisa, mantendo perguntas conversacionais simples no percurso normal.
- O servidor recebe apenas a pergunta e excertos com URLs, sem áudio nem dados de contactos.
- O NEXUS reconhece e corrige respostas genéricas do modelo que aleguem não ter Internet quando fontes foram recolhidas.
- Quando nenhuma fonte responde, informa a limitação concreta e oferece ligação para pesquisar diretamente no Google.
- Cache breve em memória para pesquisas repetidas. Conteúdos publicados na Internet podem estar incorretos/desatualizados.

## Mantido da 0.9
- Voz e mãos-livres em sessão autorizada, pesquisa, abertura de aplicações, chamadas com confirmação, alarmes, mensagens SMS preparadas, lembretes, memorização de rotinas, controlo por Acessibilidade e gestos por câmara.
- Ao escolher SAIR, o NEXUS liberta câmara, microfone e recursos em uso.

## Limites de segurança e funcionalidade
- Não existe acesso garantido a toda a Web, nem navegação livre tipo browser automatizado: as fontes de pesquisa gratuitas podem falhar ou limitar o volume. O modelo trabalha apenas sobre excertos recuperados e pode cometer erros.
- Não controla todas as funções de todas as apps; Android limita APIs e interfaces protegidas.
- Chamadas requerem confirmação; envio de mensagens e pagamentos continuam a exigir confirmação do utilizador.
- Não existe vídeo 3D fotorrealista de face tracking em tempo real. A imagem é um retrato com animação facial aproximada e painéis interativos.
- Testes Android reais (rede móvel, WhatsApp, alarmes, contactos, câmara) requerem validação num dispositivo físico.
