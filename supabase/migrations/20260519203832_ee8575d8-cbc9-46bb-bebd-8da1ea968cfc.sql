UPDATE auth.users 
SET encrypted_password = crypt('KkTelecom2026&', gen_salt('bf')),
    updated_at = now()
WHERE email = 'yohan.borges@tex3digital.com.br';