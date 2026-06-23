## Objetivo

Garantir que, ao excluir permanentemente um usuário, todas as vendas dele continuem salvas no sistema, mantendo o nome original do vendedor visível.

## Situação atual

A tabela `sales` já tem dois campos preparados para isso (mas ainda não utilizados):
- `seller_name_snapshot` (text) — para guardar o nome do vendedor
- `seller_removed` (boolean) — para indicar que o vendedor foi removido

Hoje, ao excluir o usuário, a venda pode ficar órfã ou ser apagada junto, dependendo da FK.

## Plano

### 1. Banco de dados (migração)

- Ajustar a FK `sales.seller_id → auth.users(id)` (e/ou `profiles.id`) para **ON DELETE SET NULL**, de modo que a exclusão do usuário não apague a venda — apenas zera o vínculo.
- Criar trigger `BEFORE DELETE ON public.profiles` que, antes do usuário ser apagado:
  - Copia o `nome` atual do perfil para `sales.seller_name_snapshot` em todas as vendas onde `seller_id = OLD.id` e `seller_name_snapshot` está vazio.
  - Marca `seller_removed = true` nessas vendas.
- Backfill: para vendas já existentes cujo `seller_id` aponta para um usuário que ainda existe, preencher `seller_name_snapshot` com o nome atual (para não perder o histórico em exclusões futuras).

### 2. Edge function de exclusão de usuário

- Na função que apaga o usuário (Admin API), antes do `auth.admin.deleteUser`:
  - Garantir que o snapshot de nome seja salvo nas vendas do vendedor (mesmo se o trigger no `profiles` rodar via cascade do auth.users, manter como cinto-e-suspensório).

### 3. Frontend

Em todo lugar que hoje mostra o nome do vendedor a partir do `sellers[seller_id]`:
- `src/pages/Sales.tsx` (linhas ~695, 812, 975)
- `src/pages/Reports.tsx` (estatísticas por vendedor)
- `src/pages/Feedbacks.tsx`

Aplicar fallback:
```
nome do vendedor = sellers[seller_id]?.nome
                ?? sale.seller_name_snapshot
                ?? 'Vendedor removido'
```

Opcional: badge discreto "removido" quando `seller_removed = true`.

### 4. Verificação

- Criar usuário de teste, lançar uma venda, excluí-lo, e confirmar que:
  - A venda continua aparecendo nas listagens e relatórios.
  - O nome original do vendedor aparece (com indicação de removido).
  - Nenhuma RLS quebra (a venda mantém `company_id` e `equipe`, então continua visível para o time/CEO).

## Detalhes técnicos

- A migração só altera estrutura (FK + trigger + backfill via UPDATE dentro da migração para preencher snapshots existentes).
- Nenhuma alteração em RLS é necessária — as policies de `sales` não dependem de `seller_id IS NOT NULL` para CEO/Coordenador/Supervisor/Backoffice. Apenas o caminho "vendedor vê própria venda" deixa de se aplicar (o que é correto, já que o vendedor não existe mais).
- Mantém compatibilidade com a regra de isolamento multi-tenant (`company_id` permanece intacto).
