// dLocal Go API Integration
// Documentation: https://docs.dlocalgo.com/

const DLOCAL_GO_API_URL = 'https://api.dlocalgo.com';
const API_KEY = process.env.DLOCAL_GO_API_KEY!;
const SECRET_KEY = process.env.DLOCAL_GO_SECRET_KEY!;

// Base64 encode credentials for Basic Auth
function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export interface CreatePaymentLinkParams {
  amount: number;
  currency: string;
  description: string;
  external_reference?: string;
  payer_name?: string;
  payer_email?: string;
  notification_url?: string;
  back_url?: string;
  expiration_date?: string;
}

export interface PaymentLinkResponse {
  id: string;
  checkout_url: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string;
}

// Create a payment link using dLocal Go
export async function createDLocalGoPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse> {
  const body = {
    amount: params.amount,
    currency: params.currency,
    description: params.description,
    external_reference: params.external_reference,
    payer: params.payer_name ? {
      name: params.payer_name,
      email: params.payer_email,
    } : undefined,
    notification_url: params.notification_url,
    back_url: params.back_url,
    expiration_date: params.expiration_date,
  };

  console.log('Creating dLocal Go payment link:', body);

  const response = await fetch(`${DLOCAL_GO_API_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('dLocal Go error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }

  return response.json();
}

// Get payment status
export async function getPaymentStatus(paymentId: string): Promise<any> {
  const response = await fetch(`${DLOCAL_GO_API_URL}/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error fetching payment');
  }

  return response.json();
}

// Create a refund
export async function createRefund(paymentId: string, amount?: number): Promise<any> {
  const body: any = { payment_id: paymentId };
  if (amount) body.amount = amount;

  const response = await fetch(`${DLOCAL_GO_API_URL}/v1/refunds`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error creating refund');
  }

  return response.json();
}
