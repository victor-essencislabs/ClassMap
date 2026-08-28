---
name: gerar-diagrama-classmap
description: Procedimento para um agente de IA (Claude Code ou Codex) gerar o arquivo JSON de diagrama do ClassMap a partir do código-fonte de um projeto (Elims, GeoCloudAI ou outro). Use quando o usuário pedir para "gerar o diagrama do ClassMap deste projeto", "exportar as classes para o ClassMap", ou equivalente. Esta skill é portátil — pode ser copiada para o repositório do projeto-fonte (Elims/GeoCloudAI); não depende de código do ClassMap em si.
---

# Entradas obrigatórias

- Acesso de leitura ao código-fonte do projeto que será documentado (Elims, GeoCloudAI ou outro).
- Saber se o projeto tem dados de seed/fixture reais (scripts de seed, arquivos de fixture de teste) — necessário para o passo do diagrama de objetos.

# Processo

1. **Mapear as classes reais.** Percorra o código-fonte e identifique as entidades/classes reais (modelos de domínio, entidades de banco, DTOs conforme o que o usuário pedir) — nunca invente uma classe que não existe no código.
2. **Aplicar o guia de mapeamento código → diagrama** para cada relação encontrada:
   - Classe filha herda/estende classe pai → **Herança**.
   - Campo é lista de objetos "donos" de outra entidade, sem existir fora do pai → **Composição**.
   - Campo referencia outra entidade que pode existir de forma independente → **Agregação**.
   - Chave estrangeira simples / referência de leitura → **Associação**.
   - Uso pontual de um tipo em um método, sem campo persistente → **Dependência**.
   - Campo do tipo lista/coleção → multiplicidade `"0..*"` ou `"n"` no lado correspondente.
3. **Montar o diagrama de objetos (se pedido).** Priorize dados reais de seed/fixture do projeto-fonte quando existirem. Na ausência deles, gere de 1 a 3 exemplos fictícios plausíveis.
4. **Regra de segurança do processo — sem exceção.** Em nenhuma hipótese inclua dados reais de usuários ou de produção no diagrama de objetos — nem copiados de um banco, nem de um log, nem de uma captura de tela. Se a única fonte disponível for dado real de produção, gere exemplos fictícios plausíveis em vez disso e avise o usuário.
5. **Montar o JSON no schema do ClassMap:**
   ```json
   { "classes": [ { "name": "User", "attributes": [{"name":"id","type":"long"}] } ],
     "relationships": [ { "from": "User", "to": "Log", "type": "association" } ],
     "objects": [ { "name": "user1", "class": "User", "values": {"id": "1"} } ] }
   ```
6. **Validar o JSON** contra o schema antes de entregar (campos obrigatórios presentes, tipos de relação dentre os 5 válidos: `association`, `aggregation`, `composition`, `inheritance`, `dependency`).
7. **Entregar o arquivo para importação manual.** Esta skill gera o conteúdo — ela não publica, não faz commit em nome do usuário e não chama nenhuma API do ClassMap. O usuário sobe o arquivo manualmente pelo botão "Importar JSON" do ClassMap, com revisão humana antes de qualquer diagrama chegar ao gestor.

# Restrições

- Não é uma automação de CI — não rode isso automaticamente a cada merge; é uma geração sob demanda, pedida explicitamente pelo usuário.
- Não sobrescreva um arquivo de diagrama já existente sem confirmação.
- Não inclua classes ou relações que não existem no código real, mesmo que pareçam "óbvias" para completar o modelo.
- Não inclua dados reais de usuários/produção no diagrama de objetos, mesmo que estejam disponíveis e pareçam inofensivos.

# Saída

- Um arquivo JSON no schema do ClassMap (nome sugerido: `classmap-diagram.json`, ou o nome que o usuário pedir).
- Resumo: quantas classes, relações (por tipo) e objetos foram gerados.
- Aviso explícito se algum dado do diagrama de objetos veio de seed/fixture real vs. foi gerado como exemplo fictício.
