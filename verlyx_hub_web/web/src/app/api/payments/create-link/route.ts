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
    const data = await request.json();
    
    const {
      amount,
      currency,
      country,
      description,
      client_name,
      client_email,
      project_id,
      deal_id,
      expires_in_days = 7,
    } = data;

    // Validate required fields
    if (!amount || !description) {
      return NextResponse.json({ 
        error: 'Amount and description are required' 
      }, { status: 400 });
    }

    // Validate minimum amount for dLocal Go
    if (parseFloat(amount.toString()) < 100) {
      return NextResponse.json({ 
        error: 'El monto mínimo es USD 100 (o equivalente) para pagos con dLocal Go' 
      }, { status: 400 });
    }

    // Generate unique order ID
    const order_id = `VLX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiration date
    const expiration_date = new Date();
    expiration_date.setDate(expiration_date.getDate() + expires_in_days);

    let paymentLink: any = null;
    let dLocalError: string | null = null;
    let payment_url: string | null = null;

    // Check if we have valid credentials
    if (!API_KEY || !SECRET_KEY) {
      console.log('📌 No dLocal Go credentials - using demo mode');
      payment_url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pay/${order_id}`;
    } else {
      // Don't call dLocal Go API here - just create Verlyx Pay link
      // Payment will be processed when user submits their card
      payment_url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pay/${order_id}`;
      console.log('💡 Creating Verlyx Pay link (card will be processed when user pays)');
    }

    // Save to database
    const { data: savedLink, error: dbError } = await supabase
      .from('payment_links')
      .insert({
        order_id: order_id,
        external_id: paymentLink?.id || null,
        amount: amount,
        currency: currency,
        country: country || 'UY',
        description: description,
        client_name: client_name,
        client_email: client_email,
        project_id: project_id,
        deal_id: deal_id,
        status: 'pending',
        payment_url: payment_url,
        expires_at: expiration_date.toISOString(),
        error_message: dLocalError,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save payment link',
        details: dbError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      demo_mode: !paymentLink,
      payment_link: {
        ...savedLink,
        redirect_url: payment_url,
        checkout_url: payment_url,
      },
    });

  } catch (error: any) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
