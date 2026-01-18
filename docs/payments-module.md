# Módulo de Pagos - Verlyx Hub

## Visión General

El módulo de pagos integra **MercadoPago** para proveer dos funcionalidades principales:

1. **Links de Pago**: Generación de enlaces únicos para cobros puntuales
2. **Suscripciones/Débitos Automáticos**: Cobros recurrentes automatizados

## Flujo de Links de Pago

### 1. Generación de Link

**Frontend:**
```dart
// Desde pantalla de cliente o proyecto
final paymentLink = await paymentService.createPaymentLink(
  amount: 5000,
  currency: 'UYU',
  description: 'Desarrollo Web - Empresa XYZ',
  customerId: contactId,
  projectId: projectId,
);
```

**Backend:**
```typescript
@Post('payment-links')
async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
  // 1. Crear preference en MercadoPago
  const preference = await this.mercadopagoService.createPreference({
    items: [{ title: dto.description, quantity: 1, unit_price: dto.amount }],
    back_urls: { ... },
    notification_url: `${API_URL}/webhooks/mercadopago`,
  });
  
  // 2. Guardar en DB
  const link = await this.paymentLinksRepository.save({
    externalId: preference.id,
    paymentUrl: preference.init_point,
    amount: dto.amount,
    status: 'pending',
    customerId: dto.customerId,
    projectId: dto.projectId,
  });
  
  return link;
}
```

### 2. Cliente Paga

- Frontend abre el link en webview/browser
- Cliente completa el pago en MercadoPago
- MercadoPago redirige a success/failure URL

### 3. Webhook de Confirmación

```typescript
@Post('webhooks/mercadopago')
async handleWebhook(@Body() body: any, @Headers('x-signature') signature: string) {
  // 1. Verificar firma HMAC
  if (!this.verifySignature(body, signature)) {
    throw new UnauthorizedException();
  }
  
  // 2. Procesar notificación
  if (body.type === 'payment') {
    const payment = await this.mercadopagoService.getPayment(body.data.id);
    
    // 3. Actualizar DB
    await this.paymentLinksRepository.update(
      { externalId: payment.preference_id },
      { 
        status: payment.status === 'approved' ? 'paid' : 'failed',
        paidAt: payment.status === 'approved' ? new Date() : null,
      }
    );
    
    // 4. Crear registro de payment
    await this.paymentsRepository.save({
      externalPaymentId: payment.id,
      amount: payment.transaction_amount,
      status: payment.status === 'approved' ? 'completed' : 'failed',
      paymentMethod: payment.payment_method_id,
      customerId: ...,
      paymentLinkId: ...,
    });
    
    // 5. Notificar usuario
    await this.notificationsService.send({
      userId: ownerId,
      type: 'payment',
      title: 'Pago recibido',
      message: `Se recibió un pago de $${payment.transaction_amount}`,
    });
  }
  
  return { received: true };
}
```

## Flujo de Suscripciones

### 1. Crear Suscripción

**Backend:**
```typescript
@Post('subscriptions')
async createSubscription(@Body() dto: CreateSubscriptionDto) {
  // 1. Crear preapproval en MercadoPago
  const preapproval = await this.mercadopagoService.createPreapproval({
    reason: dto.planName,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months', // monthly
      transaction_amount: dto.amount,
      currency_id: dto.currency,
      start_date: dto.startDate,
    },
    back_url: `${APP_URL}/subscriptions/success`,
    notification_url: `${API_URL}/webhooks/mercadopago/subscriptions`,
  });
  
  // 2. Guardar en DB
  const subscription = await this.subscriptionsRepository.save({
    externalSubscriptionId: preapproval.id,
    customerId: dto.customerId,
    planName: dto.planName,
    amount: dto.amount,
    billingFrequency: 'monthly',
    status: 'active',
    startDate: dto.startDate,
    nextBillingDate: this.calculateNextBilling(dto.startDate),
  });
  
  return {
    subscription,
    initPoint: preapproval.init_point, // Cliente debe autorizar aquí
  };
}
```

### 2. Cliente Autoriza

- Frontend abre `init_point` en webview
- Cliente autoriza débito automático en MercadoPago
- MercadoPago retorna a `back_url`

### 3. Cobros Recurrentes

MercadoPago ejecuta el cobro automáticamente según la frecuencia configurada.

**Webhook de cobro:**
```typescript
@Post('webhooks/mercadopago/subscriptions')
async handleSubscriptionWebhook(@Body() body: any) {
  if (body.type === 'payment') {
    const payment = await this.mercadopagoService.getPayment(body.data.id);
    
    // Buscar suscripción asociada
    const subscription = await this.subscriptionsRepository.findOne({
      where: { externalSubscriptionId: payment.preapproval_id },
    });
    
    if (payment.status === 'approved') {
      // Cobro exitoso
      await this.paymentsRepository.save({
        externalPaymentId: payment.id,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        amount: payment.transaction_amount,
        status: 'completed',
        paymentMethod: payment.payment_method_id,
      });
      
      // Actualizar próxima fecha de cobro
      await this.subscriptionsRepository.update(subscription.id, {
        nextBillingDate: this.calculateNextBilling(new Date()),
      });
      
      // Notificar
      await this.notificationsService.send({
        type: 'payment',
        title: 'Cobro de suscripción exitoso',
        message: `Se cobró $${payment.transaction_amount} de ${subscription.planName}`,
      });
    } else {
      // Cobro fallido
      await this.paymentsRepository.save({
        externalPaymentId: payment.id,
        subscriptionId: subscription.id,
        status: 'failed',
        amount: payment.transaction_amount,
      });
      
      // Marcar suscripción como fallida
      await this.subscriptionsRepository.update(subscription.id, {
        status: 'failed',
      });
      
      // Notificar error
      await this.notificationsService.send({
        type: 'payment',
        title: 'Error en cobro de suscripción',
        message: `Falló el cobro de ${subscription.planName}. Verificar método de pago.`,
      });
    }
  }
  
  return { received: true };
}
```

### 4. Cancelar Suscripción

```typescript
@Delete('subscriptions/:id')
async cancelSubscription(@Param('id') id: string) {
  const subscription = await this.subscriptionsRepository.findOne(id);
  
  // Cancelar en MercadoPago
  await this.mercadopagoService.cancelPreapproval(
    subscription.externalSubscriptionId
  );
  
  // Actualizar DB
  await this.subscriptionsRepository.update(id, {
    status: 'cancelled',
    cancelledAt: new Date(),
  });
  
  return { message: 'Subscription cancelled' };
}
```

## Frontend UI

### Crear Link de Pago

```dart
// Botón en pantalla de cliente/proyecto
ElevatedButton.icon(
  icon: Icon(Icons.payment),
  label: Text('Generar Link de Pago'),
  onPressed: () async {
    final result = await showDialog<PaymentLinkData>(
      context: context,
      builder: (context) => CreatePaymentLinkDialog(
        customerId: contact.id,
      ),
    );
    
    if (result != null) {
      // Copiar link al clipboard
      await Clipboard.setData(ClipboardData(text: result.url));
      
      // Mostrar snackbar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Link copiado al portapapeles')),
      );
      
      // Opción de compartir
      Share.share(result.url);
    }
  },
)
```

### Ver Suscripciones

```dart
// Pantalla de suscripciones
ListView.builder(
  itemCount: subscriptions.length,
  itemBuilder: (context, index) {
    final sub = subscriptions[index];
    
    return Card(
      child: ListTile(
        leading: Icon(
          sub.status == 'active' 
            ? Icons.check_circle 
            : Icons.error,
          color: sub.status == 'active' 
            ? Colors.green 
            : Colors.red,
        ),
        title: Text(sub.planName),
        subtitle: Text(
          'Próximo cobro: ${DateFormat('dd/MM/yyyy').format(sub.nextBillingDate)}'
        ),
        trailing: Text('\$${sub.amount}'),
        onTap: () => _showSubscriptionDetails(sub),
      ),
    );
  },
)
```

## Seguridad

### Verificación de Webhooks

```typescript
private verifySignature(body: any, signature: string): boolean {
  const secret = this.configService.get('MERCADOPAGO_WEBHOOK_SECRET');
  
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return hmac === signature;
}
```

### Manejo de Datos Sensibles

- **NUNCA** almacenar números de tarjeta
- Solo guardar tokens/IDs externos
- Usar HTTPS obligatorio
- Logs sin datos sensibles

## Testing

### Test de Webhook

```bash
# Simular webhook de MercadoPago
curl -X POST http://localhost:3000/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-signature: <HMAC>" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

## Monitoreo

- Logs de todos los webhooks recibidos
- Alertas para pagos fallidos
- Dashboard con métricas:
  - Total de ingresos del mes
  - Pagos pendientes
  - Suscripciones activas
  - Tasa de éxito de cobros

## Referencias

- [MercadoPago Preferences API](https://www.mercadopago.com.uy/developers/es/docs/checkout-pro/landing)
- [MercadoPago Subscriptions](https://www.mercadopago.com.uy/developers/es/docs/subscriptions/landing)
- [Webhooks](https://www.mercadopago.com.uy/developers/es/docs/your-integrations/notifications/webhooks)
