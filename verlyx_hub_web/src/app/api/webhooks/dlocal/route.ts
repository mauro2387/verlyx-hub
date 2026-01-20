import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// dLocal Go webhook handler
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('dLocal Go webhook received:', JSON.stringify(payload, null, 2));

    const {
      id: payment_id,
      external_reference,
      status,
      amount,
      currency,
      payment_method,
    } = payload;

    // Map dLocal Go status to our status
    const statusMap: Record<string, string> = {
      'PAID': 'paid',
      'APPROVED': 'paid',
      'PENDING': 'pending',
      'REJECTED': 'failed',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'expired',
    };

    const mappedStatus = statusMap[status?.toUpperCase()] || 'pending';

    // Find and update payment link by external_reference (our order_id)
    if (external_reference) {
      const { error: linkError } = await supabase
        .from('payment_links')
        .update({
          status: mappedStatus,
          external_payment_id: payment_id,
          payment_method: payment_method,
          paid_at: mappedStatus === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', external_reference);

      if (linkError) {
        console.error('Error updating payment link:', linkError);
      }

      // Create payment record if paid
      if (mappedStatus === 'paid') {
        const { data: paymentLink } = await supabase
          .from('payment_links')
          .select('*')
          .eq('order_id', external_reference)
          .single();

        if (paymentLink) {
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              external_id: payment_id,
              payment_link_id: paymentLink.id,
              order_id: external_reference,
              amount: amount || paymentLink.amount,
              currency: currency || paymentLink.currency,
              status: 'completed',
              payment_method: payment_method,
              client_name: paymentLink.client_name,
              description: paymentLink.description,
              project_id: paymentLink.project_id,
              deal_id: paymentLink.deal_id,
              paid_at: new Date().toISOString(),
            });

          if (paymentError) {
            console.error('Error creating payment record:', paymentError);
          }

          // Create notification
          await supabase.from('notifications').insert({
            type: 'payment',
            title: 'Pago recibido',
            message: `Se recibió un pago de ${currency || 'USD'} ${(amount || paymentLink.amount).toLocaleString()} de ${paymentLink.client_name || 'Cliente'}`,
            data: { payment_id, order_id: external_reference, amount },
            read: false,
            created_at: new Date().toISOString(),
          }).catch(e => console.log('Notification error (non-critical):', e));
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'dLocal Go webhook' });
}
