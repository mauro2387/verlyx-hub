'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

interface PaymentLinkData {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  description: string;
  client_name?: string;
  status: string;
}

export default function VerlyxPayPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentLinkData | null>(null);
  const [smartFieldsReady, setSmartFieldsReady] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });

  const smartFieldsRef = useRef<any>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardHolderRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        const res = await fetch(`/api/payments/get-link?order_id=${orderId}`);
        if (!res.ok) throw new Error('Link de pago no encontrado');
        
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

  const initializeSmartFields = () => {
    // SmartFields deshabilitado - usando inputs normales
    console.log('⚠️ SmartFields not available, using standard inputs');
    setSmartFieldsReady(true);
  };

  // Effect to enable form when payment data is ready
  useEffect(() => {
    if (paymentData && !loading && !smartFieldsReady) {
      console.log('✅ Payment data loaded, enabling form');
      setSmartFieldsReady(true);
    }
  }, [paymentData, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'number') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 16) {
        const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
        setCardData(prev => ({ ...prev, number: formatted }));
      }
    } else if (name === 'expiry') {
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 4) {
        if (cleaned.length >= 2) {
          cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        setCardData(prev => ({ ...prev, expiry: cleaned }));
      }
    } else if (name === 'cvv') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 4) {
        setCardData(prev => ({ ...prev, cvv: cleaned }));
      }
    } else {
      setCardData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentData) return;

    setProcessing(true);
    setError(null);

    try {
      let token = null;

      // Si SmartFields está disponible y SDK cargado, tokenizar
      if (sdkLoaded && smartFieldsRef.current) {
        console.log('🔐 Tokenizing with SmartFields...');
        const tokenResult = await smartFieldsRef.current.createToken();
        
        if (!tokenResult || !tokenResult.token) {
          throw new Error('Error al procesar los datos de la tarjeta');
        }
        token = tokenResult.token;
      } else {
        // Fallback: enviar datos directamente (modo de prueba)
        console.log('⚠️ Using fallback mode - sending card data directly');
        
        // Validaciones básicas
        const cardNumber = cardData.number.replace(/\s/g, '');
        if (cardNumber.length !== 16) {
          throw new Error('Número de tarjeta inválido');
        }

        const [month, year] = cardData.expiry.split('/');
        if (!month || !year || month.length !== 2 || year.length !== 2) {
          throw new Error('Fecha de expiración inválida');
        }

        if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
          throw new Error('CVV inválido');
        }

        if (!cardData.name.trim()) {
          throw new Error('Nombre del titular requerido');
        }

        // Enviar datos de tarjeta directamente
        const res = await fetch('/api/payments/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            card: {
              number: cardNumber,
              holder_name: cardData.name,
              expiration: cardData.expiry,
              cvv: cardData.cvv,
            },
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || 'Error procesando el pago');
        }

        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }

      // Enviar el token al backend
      const res = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          token: token,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error procesando el pago');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
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
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Cargando información del pago...</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-5xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white">¡Pago exitoso!</h1>
          <p className="text-gray-400">Tu pago ha sido procesado correctamente</p>
          <p className="text-sm text-gray-500">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-5xl">✗</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Error</h1>
          <p className="text-gray-400">{error || 'Link de pago no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-2 bg-blue-500/10 rounded-full text-blue-400 text-sm font-medium mb-4">
            🔒 Pago Seguro
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Verlyx Pay
          </h1>
        </div>

        {/* Payment Form */}
        {!processing && !success && (
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <p className="text-gray-400 text-sm mb-2">Total a pagar</p>
              <p className="text-4xl font-bold text-white">
                {new Intl.NumberFormat('es-UY', {
                  style: 'currency',
                  currency: paymentData.currency,
                }).format(paymentData.amount)}
              </p>
              <p className="text-gray-400 text-sm mt-2">{paymentData.description}</p>
              {paymentData.client_name && (
                <p className="text-gray-500 text-xs mt-1">Para: {paymentData.client_name}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Número de tarjeta
                </label>
                <input
                  type="text"
                  name="number"
                  value={cardData.number}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Titular de la tarjeta
                </label>
                <input
                  type="text"
                  name="name"
                  value={cardData.name}
                  onChange={handleInputChange}
                  placeholder="NOMBRE APELLIDO"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Expiración
                  </label>
                  <input
                    type="text"
                    name="expiry"
                    value={cardData.expiry}
                    onChange={handleInputChange}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    value={cardData.cvv}
                    onChange={handleInputChange}
                    placeholder="123"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={processing || !smartFieldsReady}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white font-semibold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {processing ? 'Procesando pago...' : !smartFieldsReady ? 'Cargando...' : 'Pagar ahora'}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  Al confirmar, aceptas nuestros términos y condiciones
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
