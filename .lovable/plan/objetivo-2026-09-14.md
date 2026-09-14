## Objetivo

Criar uma visão de Vendedores para acompanhar o resultado mensal individual, com comissão calculada por venda e acesso direto ao relatório já filtrado.

## Implementação

- Adicionar em cada venda um percentual próprio de comissão, iniciado em 0%, validado entre 0% e 100%.
- Permitir que somente o CEO informe ou altere esse percentual nos formulários de cadastro e edição; os demais usuários não poderão modificá-lo, inclusive por chamadas diretas.
- Calcular a comissão de cada venda como `valor_mensal × percentual da venda` e atualizar os totais de Equipes para somarem essas comissões individuais.
- Criar a tela **Vendedores**, respeitando a empresa e as equipes acessíveis ao usuário, com busca e visão mensal por vendedor:
  - vendas não canceladas;
  - valor mensal total;
  - comissão estimada total;
  - vendas canceladas;
  - equipe e situação do vendedor.
- Adicionar ações para abrir os detalhes do vendedor e o relatório com vendedor e mês atual já selecionados.
- Fazer Relatórios reconhecer o vendedor enviado pelo link.
- Corrigir o relatório de canceladas para usar e exibir `motivo_cancelamento`, mantendo filtro e exportação coerentes.
- Adicionar **Vendedores** à navegação para CEO, Coordenador e Supervisor.

## Regras de consistência

- Vendas canceladas não geram comissão.
- O período usa `data_venda`; quando ausente, usa `created_at`.
- Comissão total do vendedor/equipe é a soma das comissões das vendas válidas, não uma taxa aplicada depois sobre o total.
- Vendas antigas permanecem com comissão de 0% até o CEO definir uma taxa.
- Toda leitura e alteração continua isolada por empresa e pelas permissões de equipe existentes.

## Verificação

- Validar cadastro e edição como CEO e confirmar bloqueio para os demais perfis.
- Conferir vendedor com vendas válidas, canceladas, taxas diferentes e vendas sem taxa.
- Confirmar links para Relatórios, motivo correto do cancelamento e cálculos em Vendedores e Equipes.
- Conferir a nova tela em celular e computador e garantir que a aplicação continue sem erros.
