'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface PaymentLinkData {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  description: string;
  client_name?: string;
  client_email?: string;
  status: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentLinkData | null>(null);

  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });

  // Load payment link data
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        const res = await fetch(`/api/payments/get-link?order_id=${orderId}`);
        if (!res.ok) {
          throw new Error('Link de pago no encontrado');
        }
        const data = await res.json();
        
        if (data.status === 'paid') {
          setSuccess(true);
        } else if (data.status === 'expired') {
          setError('Este link de pago ha expirado');
        } else {
          setPaymentData(data);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar el pago');
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      // Process payment with dLocal Go
      const res = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          card: cardData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al procesar el pago');
      }

      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/payments/success?order_id=${orderId}`);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {success ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Pago Exitoso!</h2>
            <p className="text-gray-400 mb-4">Order ID: {orderId}</p>
            <p className="text-sm text-gray-500">Redirigiendo...</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-8">
            {/* Verlyx Branding */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                Verlyx Pay
              </h1>
              <p className="text-gray-400 text-sm">Pago seguro y encriptado 🔒</p>
            </div>

            {/* Payment Details */}
            {paymentData && (
              <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Monto a pagar:</span>
                  <span className="text-2xl font-bold text-white">
                    {paymentData.currency} ${paymentData.amount.toFixed(2)}
                  </span>
                </div>
                {paymentData.description && (
                  <p className="text-gray-500 text-sm mt-2">{paymentData.description}</p>
                )}
                {paymentData.client_name && (
                  <p className="text-gray-500 text-sm">Para: {paymentData.client_name}</p>
                )}
              </div>
            )}

            {/* Payment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Número de tarjeta
                </label>
                <input
                  type="text"
                  value={cardData.number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '');
                    if (value.length <= 16 && /^\d*$/.test(value)) {
                      setCardData({ ...cardData, number: value });
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del titular
                </label>
                <input
                  type="text"
                  value={cardData.name}
                  onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                  placeholder="JUAN PEREZ"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vencimiento
                  </label>
                  <input
                    type="text"
                    value={cardData.expiry}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      setCardData({ ...cardData, expiry: value });
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cardData.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 4) {
                        setCardData({ ...cardData, cvv: value });
                      }
                    }}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando pago...
                  </span>
                ) : (
                  `Pagar ${paymentData ? paymentData.currency + ' $' + paymentData.amount.toFixed(2) : ''}`
                )}
              </button>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Pago 100% seguro con encriptación SSL</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
