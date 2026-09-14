## Objetivo

Evitar que a data da venda seja alterada por conversões de fuso horário durante o cadastro.

## Implementação

- Criar uma rotina compartilhada que aceite somente datas reais no formato `AAAA-MM-DD` e devolva exatamente esse mesmo formato, sem criar objetos de data em UTC.
- Validar `data_venda` antes de enviar o cadastro; impedir o envio e destacar o campo quando estiver vazia ou inválida.
- Enviar ao banco apenas a data já normalizada, mantendo o dia escolhido pelo usuário.
- Ajustar a exibição da data na lista de vendas para formatar a string localmente, sem deslocar o dia.

## Verificação

- Confirmar que datas na virada de mês, como `02/09/2026`, permanecem no mesmo dia ao salvar e exibir.
- Conferir o resultado no navegador e validar que não há erros na aplicação.
