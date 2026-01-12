-- Etapa 1: Adicionar SUPERVISOR ao enum app_role
ALTER TYPE app_role ADD VALUE 'SUPERVISOR' AFTER 'BACKOFFICE';