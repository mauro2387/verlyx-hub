import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// dLocal Go API
const DLOCAL_GO_API_URL = 'https://api.dlocalgo.com';
const API_KEY = process.env.DLOCAL_GO_API_KEY || '';
const SECRET_KEY = process.env.DLOCAL_GO_SECRET_KEY || '';

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, token, card } = body;

    console.log('📥 Payment request received:', { order_id, hasToken: !!token, hasCard: !!card });

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    if (!token && !card) {
      return NextResponse.json({ error: 'Missing payment data (token or card)' }, { status: 400 });
    }

    // Get payment link from database
    const { data: paymentLink, error: dbError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (dbError || !paymentLink) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    if (paymentLink.status === 'paid') {
      return NextResponse.json({ error: 'This payment has already been completed' }, { status: 400 });
    }

    // Process payment with dLocal Go
    try {
      // Build payment body
      const paymentBody: any = {
        amount: parseFloat(paymentLink.amount.toString()),
        currency: paymentLink.currency,
        country: paymentLink.country || 'UY',
        description: paymentLink.description || 'Pago Verlyx',
        external_reference: order_id,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/dlocal`,
        payment_method_flow: 'DIRECT',
        payer: {
          email: paymentLink.client_email || 'noreply@verlyx.com',
        },
      };

      // Add token or card data
      if (token) {
        paymentBody.token = token;
        console.log('💳 Processing payment with token for:', order_id);
      } else if (card) {
        // Parse expiration MM/YY
        const [expMonth, expYear] = card.expiration.split('/');
        paymentBody.card = {
          number: card.number.replace(/\s/g, ''),
          holder_name: card.holder_name,
          expiration_month: parseInt(expMonth, 10),
          expiration_year: 2000 + parseInt(expYear, 10),
          cvv: card.cvv,
        };
        console.log('💳 Processing payment with card data for:', order_id);
      }

      console.log('💳 Amount:', paymentLink.amount, paymentLink.currency);

      const response = await fetch(`${DLOCAL_GO_API_URL}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentBody),
      });

      const responseData = await response.json();
      console.log('✅ dLocal Go response:', response.status, responseData);

      if (!response.ok) {
        console.error('❌ dLocal Go payment failed:', responseData);
        throw new Error(responseData.message || responseData.error || 'Payment failed');
      }

      console.log('✅ Payment successful! ID:', responseData.id);

      // Update payment link as paid
      await supabase
        .from('payment_links')
        .update({
          status: 'paid',
          external_id: responseData.id,
          paid_at: new Date().toISOString(),
          payment_method: 'CARD',
          payment_method_type: responseData.payment_method_type,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order_id);

      // Create payment record
      await supabase
        .from('payments')
        .insert({
          external_id: responseData.id,
          payment_link_id: paymentLink.id,
          order_id: order_id,
          amount: paymentLink.amount,
          currency: paymentLink.currency,
          status: 'completed',
          payment_method: 'CARD',
          payment_method_type: responseData.payment_method_type,
          client_name: paymentLink.client_name || 'Cliente',
          description: paymentLink.description,
          project_id: paymentLink.project_id,
          deal_id: paymentLink.deal_id,
          paid_at: new Date().toISOString(),
        });

      return NextResponse.json({ 
        success: true, 
        payment_id: responseData.id,
        order_id: order_id,
      });

    } catch (apiError: any) {
      console.error('dLocal Go API error:', apiError);
      
      // Update payment link with error
      await supabase
        .from('payment_links')
        .update({
          status: 'failed',
          error_message: apiError.message,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order_id);

      return NextResponse.json({ 
        error: apiError.message || 'Payment processing failed' 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
