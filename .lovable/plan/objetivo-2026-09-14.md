## Objetivo

Transformar a tela de Equipes em uma visão de acompanhamento operacional, mostrando os resultados do mês de cada equipe e acesso direto ao relatório filtrado.

## Implementação

- Adicionar à empresa uma taxa única de comissão, configurável somente pelo CEO e iniciada em 0% para não inventar valores financeiros.
- Incluir essa taxa nas Configurações, com validação entre 0% e 100%.
- Carregar na tela de Equipes as vendas do mês atual, respeitando as permissões e o isolamento da empresa.
- Para cada equipe, exibir:
  - quantidade de vendas não canceladas;
  - valor mensal total dessas vendas;
  - comissão estimada usando a taxa configurada;
  - quantidade de vendas canceladas;
  - membros e supervisor já existentes.
- Adicionar um botão “Ver relatório” em cada equipe, abrindo Relatórios com a equipe e o mês atual já selecionados.
- Fazer Relatórios reconhecer os filtros enviados pelo link.

## Regras de consistência

- Comissão = soma de `valor_mensal` das vendas não canceladas × taxa da empresa.
- Vendas canceladas não geram comissão.
- O período usa `data_venda`; somente quando ela estiver ausente, usa a data de criação.
- O valor será identificado como estimativa, pois não representa pagamento ou fechamento contábil.

## Verificação

- Validar cálculos com equipes sem vendas, com vendas válidas e canceladas.
- Confirmar o acesso de CEO e Supervisor e o filtro correto ao abrir o relatório.
- Conferir a tela em celular e computador e garantir que a aplicação continue sem erros.
