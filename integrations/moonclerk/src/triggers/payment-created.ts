import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { paymentSchema } from '../lib/schemas';
import { spec } from '../spec';

export let paymentCreatedTrigger = SlateTrigger.create(spec, {
  name: 'Payment Created',
  key: 'payment_created',
  description:
    'Triggers when a payment is created in MoonClerk (in any state: successful, failed, or refunded). Requires configuring a webhook endpoint in MoonClerk dashboard with the "Payment Created" topic.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      payment: z.record(z.string(), z.unknown()).describe('Raw payment data from webhook')
    })
  )
  .output(paymentSchema)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      // MoonClerk payment webhook sends the payment data directly
      let payment = (body.payment as Record<string, unknown>) ?? body;

      return {
        inputs: [
          {
            topic: 'payment_created',
            payment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.payment;

      let paymentSource = (raw.payment_source as Record<string, unknown>) ?? {};
      let couponRaw = (raw.coupon as Record<string, unknown>) ?? null;
      let customFieldsRaw = (raw.custom_fields as Record<string, unknown>) ?? {};

      let customFields: Record<
        string,
        { customFieldId: number; type: string; response: unknown }
      > = {};
      for (let [key, value] of Object.entries(customFieldsRaw)) {
        let field = value as Record<string, unknown>;
        customFields[key] = {
          customFieldId: (field.id as number) ?? 0,
          type: (field.type as string) ?? 'string',
          response: field.response ?? null
        };
      }

      let paymentId = (raw.id as number) ?? 0;

      return {
        type: 'payment.created',
        id: String(paymentId),
        output: {
          paymentId,
          date: (raw.date as string) ?? '',
          status: (raw.status as string) ?? '',
          currency: (raw.currency as string) ?? '',
          amount: (raw.amount as number) ?? 0,
          fee: (raw.fee as number) ?? 0,
          amountRefunded: (raw.amount_refunded as number) ?? 0,
          amountDescription: (raw.amount_description as string) ?? null,
          name: (raw.name as string) ?? '',
          email: (raw.email as string) ?? '',
          paymentSource: {
            type: (paymentSource.type as string) ?? null,
            last4: (paymentSource.last4 as string) ?? null,
            brand: (paymentSource.brand as string) ?? null,
            expMonth: (paymentSource.exp_month as number) ?? null,
            expYear: (paymentSource.exp_year as number) ?? null,
            bankName: (paymentSource.bank_name as string) ?? null
          },
          customId: (raw.custom_id as string) ?? null,
          chargeReference: (raw.charge_reference as string) ?? null,
          customerId: (raw.customer_id as number) ?? null,
          customerReference: (raw.customer_reference as string) ?? null,
          invoiceReference: (raw.invoice_reference as string) ?? null,
          formId: (raw.form_id as number) ?? 0,
          coupon: couponRaw
            ? {
                code: (couponRaw.code as string) ?? '',
                duration: (couponRaw.duration as string) ?? '',
                amountOff: (couponRaw.amount_off as number) ?? null,
                currency: (couponRaw.currency as string) ?? null,
                percentOff: (couponRaw.percent_off as number) ?? null,
                durationInMonths: (couponRaw.duration_in_months as number) ?? null,
                maxRedemptions: (couponRaw.max_redemptions as number) ?? null
              }
            : null,
          customFields,
          checkout: (raw.checkout as Record<string, unknown>) ?? null
        }
      };
    }
  })
  .build();
