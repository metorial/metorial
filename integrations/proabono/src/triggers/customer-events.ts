import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let customerEventTypes = [
  'CustomerAdded',
  'CustomerBillingAddressUpdated',
  'CustomerSettingsPaymentUpdated',
  'CustomerBillingSucceeded',
  'CustomerBillingFailed',
  'CustomerChargingSucceeded',
  'CustomerChargingPending',
  'CustomerChargingFailed',
  'CustomerChargingAutoFailedNoPermission',
  'CustomerChargingAutoFailedNoRetry',
  'CustomerSuspended',
  'CustomerEnabled',
  'CustomerIsGreyListed'
] as const;

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggers on customer lifecycle events including creation, billing, charging, suspension, and grey-listing. Configure the webhook in ProAbono BackOffice under Integration > My Webhooks, point it to the provided URL, and select customer-related events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('ProAbono event type (e.g., CustomerAdded, CustomerSuspended)'),
      eventId: z.string().describe('Unique event identifier'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      customerId: z.number().optional().describe('ProAbono customer ID'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      referenceCustomer: z
        .string()
        .optional()
        .describe('Customer reference in your application'),
      customerId: z.number().optional().describe('ProAbono internal customer ID'),
      name: z.string().optional().describe('Customer name'),
      email: z.string().optional().describe('Customer email'),
      status: z.string().optional().describe('Customer status'),
      language: z.string().optional().describe('Customer language'),
      currency: z.string().optional().describe('Customer currency'),
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
      let isCustomerEvent =
        customerEventTypes.some(t => eventType === t) || eventType.startsWith('Customer');

      if (!isCustomerEvent && eventType) {
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
            referenceCustomer: data?.ReferenceCustomer,
            customerId: data?.IdCustomer ?? data?.Id,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, referenceCustomer, customerId, rawPayload } = ctx.input;

      let name = rawPayload?.Name;
      let email = rawPayload?.Email;
      let status = rawPayload?.Status;
      let language = rawPayload?.Language;
      let currency = rawPayload?.Currency;

      if (referenceCustomer && !name) {
        try {
          let client = new ProAbonoClient({
            token: ctx.auth.token,
            apiEndpoint: ctx.config.apiEndpoint
          });
          let customer = await client.getCustomer(referenceCustomer);
          name = name || customer?.Name;
          email = email || customer?.Email;
          status = status || customer?.Status;
          language = language || customer?.Language;
          currency = currency || customer?.Currency;
          customerId = customerId || customer?.Id;
        } catch {
          // Customer details fetch is best-effort
        }
      }

      let typeMap: Record<string, string> = {
        CustomerAdded: 'customer.added',
        CustomerBillingAddressUpdated: 'customer.billing_address_updated',
        CustomerSettingsPaymentUpdated: 'customer.payment_settings_updated',
        CustomerBillingSucceeded: 'customer.billing_succeeded',
        CustomerBillingFailed: 'customer.billing_failed',
        CustomerChargingSucceeded: 'customer.charging_succeeded',
        CustomerChargingPending: 'customer.charging_pending',
        CustomerChargingFailed: 'customer.charging_failed',
        CustomerChargingAutoFailedNoPermission: 'customer.charging_auto_failed_no_permission',
        CustomerChargingAutoFailedNoRetry: 'customer.charging_auto_failed_no_retry',
        CustomerSuspended: 'customer.suspended',
        CustomerEnabled: 'customer.enabled',
        CustomerIsGreyListed: 'customer.grey_listed'
      };

      return {
        type:
          typeMap[eventType] || `customer.${eventType.replace(/^Customer/, '').toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          referenceCustomer,
          customerId,
          name,
          email,
          status,
          language,
          currency,
          eventType
        }
      };
    }
  })
  .build();
