import { NextRequest, NextResponse } from 'next/server';

interface Recipient {
  email: string;
  name?: string;
  companyName?: string;
}

interface SendEmailRequest {
  recipients: Recipient[];
  subject: string;
  body: string;
}

export async function POST(request: NextRequest) {
  try {
    const { recipients, subject, body } = (await request.json()) as SendEmailRequest;

    if (!recipients?.length || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: recipients, subject, body' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@verlyx.com';
    const fromName = process.env.RESEND_FROM_NAME || 'Verlyx';

    if (!apiKey) {
      // If no Resend key, simulate sending (development mode)
      console.warn('[Email API] RESEND_API_KEY not configured — simulating email send');
      return NextResponse.json({
        sent: recipients.filter(r => r.email).length,
        failed: 0,
        noEmail: recipients.filter(r => !r.email).length,
        simulated: true,
        message: 'Emails simulated (RESEND_API_KEY not configured). Add it to .env.local to send real emails.',
      });
    }

    let sent = 0;
    let failed = 0;
    let noEmail = 0;

    for (const recipient of recipients) {
      if (!recipient.email) {
        noEmail++;
        continue;
      }

      // Replace template variables
      let personalizedSubject = subject;
      let personalizedBody = body;

      const name = recipient.name || recipient.companyName || 'estimado/a';
      const empresa = recipient.companyName || '';
      const miEmpresa = fromName;

      personalizedSubject = personalizedSubject
        .replace(/\{\{nombre\}\}/g, name)
        .replace(/\{\{empresa\}\}/g, empresa)
        .replace(/\{\{mi_empresa\}\}/g, miEmpresa);

      personalizedBody = personalizedBody
        .replace(/\{\{nombre\}\}/g, name)
        .replace(/\{\{empresa\}\}/g, empresa)
        .replace(/\{\{mi_empresa\}\}/g, miEmpresa);

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [recipient.email],
            subject: personalizedSubject,
            text: personalizedBody,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const err = await res.json().catch(() => ({}));
          console.error(`[Email API] Failed for ${recipient.email}:`, err);
          failed++;
        }
      } catch (err) {
        console.error(`[Email API] Error sending to ${recipient.email}:`, err);
        failed++;
      }

      // Small delay to respect rate limits
      if (recipients.length > 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return NextResponse.json({ sent, failed, noEmail });
  } catch (error) {
    console.error('[Email API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
