import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let newCustomer = SlateTrigger.create(spec, {
  name: 'New Customer',
  key: 'new_customer',
  description:
    'Triggers when a new customer is added in Finmei. Polls the customers list and detects newly added customers.'
})
  .input(
    z.object({
      customerId: z.string().describe('Customer ID'),
      name: z.string().optional().describe('Customer name'),
      email: z.string().optional().describe('Customer email'),
      phone: z.string().optional().describe('Customer phone'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Customer ID'),
      name: z.string().optional().describe('Customer name'),
      email: z.string().optional().describe('Customer email address'),
      phone: z.string().optional().describe('Customer phone number'),
      createdAt: z.string().optional().describe('When the customer was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FinmeiClient(ctx.auth.token);

      let state = ctx.state as { knownCustomerIds?: string[] } | null;
      let knownCustomerIds = new Set(state?.knownCustomerIds ?? []);

      let result = await client.listCustomers({ page: 1, per_page: 100 });
      let rawCustomers = result?.data ?? result?.customers ?? result ?? [];
      let customersArray = Array.isArray(rawCustomers) ? rawCustomers : [];

      let inputs: Array<{
        customerId: string;
        name?: string;
        email?: string;
        phone?: string;
        createdAt?: string;
      }> = [];

      let allIds: string[] = [];

      for (let c of customersArray) {
        let id = String(c.id);
        allIds.push(id);

        if (knownCustomerIds.size > 0 && !knownCustomerIds.has(id)) {
          inputs.push({
            customerId: id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            createdAt: c.created_at
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownCustomerIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'customer.created',
        id: `customer-${ctx.input.customerId}`,
        output: {
          customerId: ctx.input.customerId,
          name: ctx.input.name,
          email: ctx.input.email,
          phone: ctx.input.phone,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
