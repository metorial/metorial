import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { customerSchema } from '../lib/schemas';
import { spec } from '../spec';

export let planEventTrigger = SlateTrigger.create(spec, {
  name: 'Plan Event',
  key: 'plan_event',
  description:
    'Triggers on plan lifecycle events: plan created, plan ended (canceled or exhausted), and plan payment failed. Requires configuring a webhook endpoint in MoonClerk dashboard with the relevant plan topic(s).'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic identifying the plan event type'),
      customer: z
        .record(z.string(), z.unknown())
        .describe('Raw customer/plan data from webhook')
    })
  )
  .output(customerSchema)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      // MoonClerk plan webhooks send customer data
      let customer = (body.customer as Record<string, unknown>) ?? body;

      // Determine the topic from the body if available
      let topic = (body.topic as string) ?? 'plan_event';

      return {
        inputs: [
          {
            topic,
            customer
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.customer;
      let topic = ctx.input.topic;

      let paymentSourceRaw = (raw.payment_source as Record<string, unknown>) ?? {};
      let discountRaw = (raw.discount as Record<string, unknown>) ?? null;
      let subscriptionRaw = (raw.subscription as Record<string, unknown>) ?? null;
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

      let couponRaw = discountRaw
        ? ((discountRaw.coupon as Record<string, unknown>) ?? null)
        : null;

      let subscription = subscriptionRaw
        ? (() => {
            let plan = (subscriptionRaw.plan as Record<string, unknown>) ?? null;
            return {
              subscriptionId: (subscriptionRaw.id as number) ?? 0,
              subscriptionReference: (subscriptionRaw.subscription_reference as string) ?? '',
              status: (subscriptionRaw.status as string) ?? '',
              start: (subscriptionRaw.start as string) ?? null,
              firstPaymentAttempt: (subscriptionRaw.first_payment_attempt as string) ?? null,
              nextPaymentAttempt: (subscriptionRaw.next_payment_attempt as string) ?? null,
              currentPeriodStart: (subscriptionRaw.current_period_start as string) ?? null,
              currentPeriodEnd: (subscriptionRaw.current_period_end as string) ?? null,
              trialStart: (subscriptionRaw.trial_start as string) ?? null,
              trialEnd: (subscriptionRaw.trial_end as string) ?? null,
              expiresAt: (subscriptionRaw.expires_at as string) ?? null,
              canceledAt: (subscriptionRaw.canceled_at as string) ?? null,
              endedAt: (subscriptionRaw.ended_at as string) ?? null,
              plan: plan
                ? {
                    planId: (plan.id as string) ?? null,
                    planReference: (plan.plan_reference as string) ?? null,
                    amount: (plan.amount as number) ?? 0,
                    currency: (plan.currency as string) ?? '',
                    interval: (plan.interval as string) ?? '',
                    intervalCount: (plan.interval_count as number) ?? 1
                  }
                : null
            };
          })()
        : null;

      let customerId = (raw.id as number) ?? 0;

      // Map topic string to event type
      let eventType = 'plan.event';
      if (topic === 'plan_created' || topic.includes('created')) {
        eventType = 'plan.created';
      } else if (topic === 'plan_ended' || topic.includes('ended')) {
        eventType = 'plan.ended';
      } else if (topic === 'plan_payment_failed' || topic.includes('failed')) {
        eventType = 'plan.payment_failed';
      }

      return {
        type: eventType,
        id: `${customerId}-${topic}-${Date.now()}`,
        output: {
          customerId,
          accountBalance: (raw.account_balance as number) ?? 0,
          name: (raw.name as string) ?? '',
          email: (raw.email as string) ?? '',
          paymentSource: {
            type: (paymentSourceRaw.type as string) ?? null,
            last4: (paymentSourceRaw.last4 as string) ?? null,
            brand: (paymentSourceRaw.brand as string) ?? null,
            expMonth: (paymentSourceRaw.exp_month as number) ?? null,
            expYear: (paymentSourceRaw.exp_year as number) ?? null,
            bankName: (paymentSourceRaw.bank_name as string) ?? null
          },
          customId: (raw.custom_id as string) ?? null,
          customerReference: (raw.customer_reference as string) ?? null,
          discount: discountRaw
            ? {
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
                startedAt: (discountRaw.started_at as string) ?? null,
                endedAt: (discountRaw.ended_at as string) ?? null
              }
            : null,
          delinquent: (raw.delinquent as boolean) ?? false,
          managementUrl: (raw.management_url as string) ?? '',
          formId: (raw.form_id as number) ?? 0,
          customFields,
          checkout: (raw.checkout as Record<string, unknown>) ?? null,
          subscription
        }
      };
    }
  })
  .build();
