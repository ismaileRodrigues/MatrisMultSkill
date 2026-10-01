# Corrida da Qualidade — plano de implementação

## Produto
Painel local para acompanhar a qualidade individual e por equipe em uma pista de corrida. O gestor cadastra funcionários e registra diariamente produção, defeitos, gravidade, tipo e observações. O sistema calcula índice de defeitos proporcional à produção, pontuação, rankings mensal e anual, destaques de qualidade/evolução e histórico de lançamentos.

## Design
- **Movimento:** dashboard editorial de pit wall / automobilismo técnico, sem estética infantil.
- **Princípios:** informação acionável, competição saudável, contraste alto e leitura rápida.
- **Cor:** azul-marinho para confiança e operação; verde-lima para qualidade e avanço; âmbar para atenção; coral para defeitos críticos.
- **Layout:** navegação lateral compacta, cabeçalho de comando e uma pista horizontal como elemento focal, apoiada por cartões de indicadores e tabela operacional.
- **Assinaturas:** pista com faixas e carros numerados; pílulas de status; “briefing da qualidade” com insights e regras visíveis.
- **Interação:** ações diretas e reversíveis; modal de lançamento; filtros mensais; dados persistidos no localStorage.
- **Animação:** carros deslizam suavemente para a posição calculada; entrada sutil dos cartões; respeitar prefers-reduced-motion.
- **Tipografia:** Space Grotesk para títulos e números, DM Sans para leitura e formulários.
- **Essência:** uma central de qualidade que transforma melhoria diária em uma corrida justa. Personalidade: precisa, motivadora, humana.
- **Voz:** direta e encorajadora. Exemplos: “Qualidade não é esconder defeito. É impedir que ele avance.” / “Hoje a pista está aberta: registre, aprenda e evolua.”
- **Marca:** wordmark “PIT QUALITY” com marcador de pista como símbolo.
- **Cor proprietária:** verde-lima `#b7f34a`, usada no avanço e nos indicadores positivos.

## Estrutura
- `index.html`: shell semântico, modais, navegação e áreas do dashboard.
- `style.css`: sistema visual responsivo, pista, cartões, tabela e estados.
- `app.js`: estado, persistência, cálculos, renderização e interações.
- `public/manus-routes.json`: manifesto da rota inicial.

## Regras
- Índice de defeitos = defeitos / produção × 1.000.
- Pontuação base = 100 - índice de defeitos, limitada entre 0 e 100; bônus de 2 pontos por dia sem defeitos no mês, limitado a 20.
- Defeito crítico reduz 8 pontos, médio 3 e leve 1; nunca abaixo de zero.
- Ranking: maior pontuação; desempate por menor índice, mais dias sem defeitos e maior produção.
- O ranking anual acumula os registros de janeiro a dezembro.
- O sistema destaca vencedor mensal, líder anual, maior regularidade e melhor equipe, sem incentivar ocultação de defeitos.
