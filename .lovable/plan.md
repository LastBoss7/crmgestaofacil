# Controle de comissão individual

## Objetivo
Criar uma tela para CEO, coordenadores e supervisores acompanharem, por vendedor, a comissão gerada no mês, o valor já pago e o saldo pendente. Somente o CEO poderá registrar ou desfazer pagamentos.

## O que será construído
- Nova página **Comissões**, acessível pelo menu de gestão para CEO, coordenadores e supervisores.
- Visão inicial do mês atual, com seletor de mês e busca por vendedor/equipe.
- Resumo geral com **Comissão gerada**, **Já pago** e **Pendente**.
- Lista por vendedor com os mesmos totais e acesso ao detalhamento.
- Detalhamento das vendas do vendedor no período, mostrando cliente, data, valor mensal, taxa, comissão calculada e situação do pagamento.
- Ação exclusiva do CEO para marcar cada venda como paga, registrando data e observação opcional, além de desfazer um lançamento incorreto.
- Vendas canceladas permanecerão visíveis para conferência, mas não gerarão comissão nem poderão ser pagas.

## Regras de cálculo
- Comissão da venda = `valor_mensal × commission_rate ÷ 100`.
- **Gerada**: soma das comissões das vendas não canceladas no período.
- **Paga**: soma dos pagamentos registrados para essas vendas.
- **Pendente**: gerada menos paga.
- O período seguirá `data_venda`, usando `created_at` apenas quando a data da venda estiver ausente.
- Ao registrar o pagamento, o valor da comissão será salvo como histórico para que alterações futuras na venda não mudem retroativamente o que foi pago.

## Segurança e histórico
- Criar uma tabela de pagamentos vinculada à venda e à empresa, com um único pagamento por venda.
- CEO, coordenador e supervisor poderão consultar apenas dados da própria empresa.
- Somente o CEO da mesma empresa poderá inserir, alterar ou desfazer pagamentos.
- O banco validará que a venda pertence à empresa, não está cancelada e que o valor pago corresponde à comissão calculada naquele momento.
- Registrar quem confirmou o pagamento, quando confirmou e a observação informada.

## Detalhes técnicos
- Aplicar uma migração com tabela, permissões, políticas de acesso e validação no banco.
- Adicionar os tipos usados pela aplicação sem editar arquivos gerados automaticamente.
- Criar a página, rota protegida e item de navegação seguindo o padrão visual existente.
- Manter o carregamento de permissões antes de autorizar ou redirecionar a página.
- Validar em tela grande e celular, incluindo o fluxo real de marcar e desfazer pagamento com uma conta CEO.
