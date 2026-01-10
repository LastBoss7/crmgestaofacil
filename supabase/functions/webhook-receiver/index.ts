import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// Tipos de eventos suportados
type WebhookEvent = 
  | 'sale.status_update'    // Atualizar status de venda
  | 'sale.created'          // Nova venda criada externamente
  | 'customer.sync'         // Sincronizar dados de cliente
  | 'notification.send';    // Enviar notificação

interface WebhookPayload {
  event: WebhookEvent;
  data: Record<string, unknown>;
  timestamp?: string;
  source?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas POST permitido
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validar webhook secret (OBRIGATÓRIO para segurança)
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
    
    // Se o secret não estiver configurado, rejeitar todas as requisições
    if (!expectedSecret) {
      console.error('WEBHOOK_SECRET not configured - rejecting request for security');
      return new Response(
        JSON.stringify({ error: 'Webhook not properly configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookSecret = req.headers.get('x-webhook-secret');
    
    // Validar que o secret foi enviado e corresponde
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.warn('Invalid or missing webhook secret received');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse do payload
    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Validar payload
    if (!payload.event || !payload.data) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: event and data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service role para operações administrativas
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let result: Record<string, unknown> = {};

    // Processar evento baseado no tipo
    switch (payload.event) {
      case 'sale.status_update': {
        // Atualizar status de uma venda
        // Payload esperado: { sale_id: string, new_status: string, motivo?: string }
        const { sale_id, new_status, motivo } = payload.data as {
          sale_id: string;
          new_status: string;
          motivo?: string;
        };

        if (!sale_id || !new_status) {
          return new Response(
            JSON.stringify({ error: 'sale_id and new_status are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const validStatuses = ['NOVA', 'EM_ANALISE', 'PENDENCIA', 'APROVADA', 'INSTALADA', 'CANCELADA'];
        if (!validStatuses.includes(new_status)) {
          return new Response(
            JSON.stringify({ error: `Invalid status. Valid options: ${validStatuses.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: Record<string, unknown> = { status: new_status };
        if (new_status === 'PENDENCIA' && motivo) {
          updateData.motivo_pendencia = motivo;
        }

        const { data: updatedSale, error: updateError } = await supabase
          .from('sales')
          .update(updateData)
          .eq('id', sale_id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating sale:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update sale', details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { message: 'Sale status updated', sale: updatedSale };
        console.log('Sale updated successfully:', sale_id);
        break;
      }

      case 'sale.created': {
        // Criar nova venda via webhook (ex: integração com sistema externo)
        // Payload esperado: { cnpj_cliente, razao_social, produtos, valor_mensal, seller_email }
        const { 
          cnpj_cliente, 
          razao_social, 
          nome_fantasia,
          contato_responsavel,
          telefone_responsavel,
          produtos, 
          valor_mensal, 
          seller_email,
          observacoes 
        } = payload.data as {
          cnpj_cliente: string;
          razao_social: string;
          nome_fantasia?: string;
          contato_responsavel?: string;
          telefone_responsavel?: string;
          produtos?: string;
          valor_mensal: number;
          seller_email?: string;
          observacoes?: string;
        };

        if (!cnpj_cliente || !razao_social || valor_mensal === undefined) {
          return new Response(
            JSON.stringify({ error: 'cnpj_cliente, razao_social, and valor_mensal are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar seller_id pelo email (se fornecido)
        let seller_id: string | null = null;
        if (seller_email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', seller_email)
            .maybeSingle();
          
          seller_id = profile?.id || null;
        }

        const { data: newSale, error: createError } = await supabase
          .from('sales')
          .insert({
            cnpj_cliente,
            razao_social,
            nome_fantasia: nome_fantasia || null,
            contato_responsavel: contato_responsavel || null,
            telefone_responsavel: telefone_responsavel || null,
            produtos: produtos || null,
            valor_mensal,
            seller_id,
            observacoes_vendedor: observacoes || null,
            status: 'NOVA',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating sale:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create sale', details: createError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { message: 'Sale created successfully', sale: newSale };
        console.log('Sale created via webhook:', newSale.id);
        break;
      }

      case 'customer.sync': {
        // Sincronizar dados de cliente (atualizar info de uma venda existente)
        const { sale_id, ...customerData } = payload.data as {
          sale_id: string;
          razao_social?: string;
          nome_fantasia?: string;
          contato_responsavel?: string;
          telefone_responsavel?: string;
        };

        if (!sale_id) {
          return new Response(
            JSON.stringify({ error: 'sale_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: syncedSale, error: syncError } = await supabase
          .from('sales')
          .update(customerData)
          .eq('id', sale_id)
          .select()
          .single();

        if (syncError) {
          console.error('Error syncing customer:', syncError);
          return new Response(
            JSON.stringify({ error: 'Failed to sync customer', details: syncError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { message: 'Customer synced successfully', sale: syncedSale };
        console.log('Customer synced:', sale_id);
        break;
      }

      case 'notification.send': {
        // Placeholder para integração com serviço de notificações
        const { type, recipient, message } = payload.data as {
          type: 'email' | 'sms' | 'push';
          recipient: string;
          message: string;
        };

        // Aqui você integraria com serviços como SendGrid, Twilio, etc.
        console.log(`Notification request: ${type} to ${recipient}`);
        result = { 
          message: 'Notification queued', 
          note: 'Implement notification service integration' 
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown event type: ${payload.event}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Log do evento processado
    console.log(`Webhook processed successfully: ${payload.event}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event: payload.event,
        ...result,
        processed_at: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
