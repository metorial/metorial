import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let subscriptionEventTypes = [
  'SubscriptionStarted',
  'SubscriptionRenewed',
  'SubscriptionSuspendedCustomer',
  'SubscriptionSuspendedPaymentInfoMissing',
  'SubscriptionSuspendedPaymentDue',
  'SubscriptionRestarted',
  'SubscriptionTerminatedAtRenewal',
  'SubscriptionTerminated',
  'SubscriptionHistory',
  'SubscriptionDeleted',
  'SubscriptionUpdated',
  'SubscriptionFeaturesUpdated',
  'SubscriptionDateTermUpdated',
  'SubscriptionUpgraded',
  'SubscriptionTerminatedForUpgrade'
] as const;

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggers on subscription lifecycle events including start, renewal, suspension, termination, upgrade, and feature changes. Configure the webhook in ProAbono BackOffice under Integration > My Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('ProAbono event type (e.g., SubscriptionStarted)'),
      eventId: z.string().describe('Unique event identifier'),
      referenceSubscription: z.string().optional().describe('Subscription reference'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      subscriptionId: z.number().optional().describe('ProAbono subscription ID'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      referenceSubscription: z.string().optional().describe('Subscription reference'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      subscriptionId: z.number().optional().describe('ProAbono subscription ID'),
      referenceOffer: z.string().optional().describe('Offer reference'),
      status: z.string().optional().describe('Subscription status'),
      stateSubscription: z.string().optional().describe('Technical subscription state'),
      dateStart: z.string().optional().describe('Subscription start date'),
      dateRenewal: z.string().optional().describe('Next renewal date'),
      dateTermination: z.string().optional().describe('Termination date'),
      amountRecurrence: z.number().optional().describe('Recurring amount in cents'),
      currency: z.string().optional().describe('Billing currency'),
      eventType: z.string().describe('The specific event that occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType = data?.Trigger || data?.TypeEvent || data?.EventType || '';
      let isSubscriptionEvent =
        subscriptionEventTypes.some(t => eventType === t) ||
        eventType.startsWith('Subscription');

      if (!isSubscriptionEvent && eventType) {
        return { inputs: [] };
      }

      let eventId =
        data?.Id?.toString() ||
        data?.IdNotification?.toString() ||
        `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            referenceSubscription: data?.ReferenceSubscription,
            referenceCustomer: data?.ReferenceCustomer,
            subscriptionId: data?.IdSubscription ?? data?.Id,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, referenceSubscription, referenceCustomer, subscriptionId, rawPayload } =
        ctx.input;

      let referenceOffer = rawPayload?.ReferenceOffer;
      let status = rawPayload?.Status;
      let stateSubscription = rawPayload?.StateSubscription;
      let dateStart = rawPayload?.DateStart;
      let dateRenewal = rawPayload?.DateRenewal;
      let dateTermination = rawPayload?.DateTermination;
      let amountRecurrence = rawPayload?.AmountRecurrence;
      let currency = rawPayload?.Currency;

      if ((referenceSubscription || subscriptionId) && !referenceOffer) {
        try {
          let client = new ProAbonoClient({
            token: ctx.auth.token,
            apiEndpoint: ctx.config.apiEndpoint
          });
          let sub = await client.getSubscription({
            ReferenceSubscription: referenceSubscription,
            IdSubscription: subscriptionId
          });
          referenceSubscription = referenceSubscription || sub?.ReferenceSubscription;
          referenceCustomer = referenceCustomer || sub?.ReferenceCustomer;
          referenceOffer = referenceOffer || sub?.ReferenceOffer;
          status = status || sub?.Status;
          stateSubscription = stateSubscription || sub?.StateSubscription;
          dateStart = dateStart || sub?.DateStart;
          dateRenewal = dateRenewal || sub?.DateRenewal;
          dateTermination = dateTermination || sub?.DateTermination;
          amountRecurrence = amountRecurrence ?? sub?.AmountRecurrence;
          currency = currency || sub?.Currency;
          subscriptionId = subscriptionId || sub?.Id;
        } catch {
          // Subscription details fetch is best-effort
        }
      }

      let typeMap: Record<string, string> = {
        SubscriptionStarted: 'subscription.started',
        SubscriptionRenewed: 'subscription.renewed',
        SubscriptionSuspendedCustomer: 'subscription.suspended_by_customer',
        SubscriptionSuspendedPaymentInfoMissing: 'subscription.suspended_payment_info_missing',
        SubscriptionSuspendedPaymentDue: 'subscription.suspended_payment_due',
        SubscriptionRestarted: 'subscription.restarted',
        SubscriptionTerminatedAtRenewal: 'subscription.terminated_at_renewal',
        SubscriptionTerminated: 'subscription.terminated',
        SubscriptionHistory: 'subscription.ended',
        SubscriptionDeleted: 'subscription.deleted',
        SubscriptionUpdated: 'subscription.updated',
        SubscriptionFeaturesUpdated: 'subscription.features_updated',
        SubscriptionDateTermUpdated: 'subscription.date_term_updated',
        SubscriptionUpgraded: 'subscription.upgraded',
        SubscriptionTerminatedForUpgrade: 'subscription.terminated_for_upgrade'
      };

      return {
        type:
          typeMap[eventType] ||
          `subscription.${eventType.replace(/^Subscription/, '').toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          referenceSubscription,
          referenceCustomer,
          subscriptionId,
          referenceOffer,
          status,
          stateSubscription,
          dateStart,
          dateRenewal,
          dateTermination,
          amountRecurrence,
          currency,
          eventType
        }
      };
    }
  })
  .build();
