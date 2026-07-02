import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

export let customerChanges = SlateTrigger.create(spec, {
  name: 'Customer Changes',
  key: 'customer_changes',
  description:
    'Triggers when customers are created or modified in a Wave business. Detects new customers and changes to existing customer records by polling.'
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer'),
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      customer: z.any().describe('Full customer data from Wave')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Unique identifier of the customer'),
      name: z.string().describe('Customer/company name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      website: z.string().optional().describe('Website URL'),
      currencyCode: z.string().optional().describe('Currency code'),
      city: z.string().optional().describe('City from address'),
      countryName: z.string().optional().describe('Country name from address'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new WaveClient(ctx.auth.token);
      let state = ctx.state as
        | { businessId?: string; knownCustomers?: Record<string, string> }
        | undefined;

      let businessId = state?.businessId;
      if (!businessId) {
        let businesses = await client.listBusinesses(1, 1);
        if (businesses.items.length === 0) {
          return { inputs: [], updatedState: state || {} };
        }
        businessId = businesses.items[0]!.id as string;
      }

      let knownCustomers: Record<string, string> = state?.knownCustomers || {};
      let inputs: Array<{
        customerId: string;
        changeType: 'created' | 'updated';
        customer: any;
      }> = [];

      let result = await client.listCustomers(businessId, 1, 50);

      for (let customer of result.items) {
        let cust = customer as any;
        let previousModifiedAt = knownCustomers[cust.id];

        if (!previousModifiedAt) {
          if (state?.knownCustomers) {
            inputs.push({
              customerId: cust.id,
              changeType: 'created',
              customer: cust
            });
          }
        } else if (cust.modifiedAt && cust.modifiedAt !== previousModifiedAt) {
          inputs.push({
            customerId: cust.id,
            changeType: 'updated',
            customer: cust
          });
        }

        knownCustomers[cust.id] = cust.modifiedAt || '';
      }

      return {
        inputs,
        updatedState: {
          businessId,
          knownCustomers
        }
      };
    },

    handleEvent: async ctx => {
      let cust = ctx.input.customer;
      return {
        type: `customer.${ctx.input.changeType}`,
        id: `${ctx.input.customerId}-${cust.modifiedAt || ctx.input.changeType}`,
        output: {
          customerId: ctx.input.customerId,
          name: cust.name,
          firstName: cust.firstName,
          lastName: cust.lastName,
          email: cust.email,
          phone: cust.phone,
          mobile: cust.mobile,
          website: cust.website,
          currencyCode: cust.currency?.code,
          city: cust.address?.city,
          countryName: cust.address?.country?.name,
          createdAt: cust.createdAt,
          modifiedAt: cust.modifiedAt
        }
      };
    }
  })
  .build();
