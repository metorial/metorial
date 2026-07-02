import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

export let customerChange = SlateTrigger.create(spec, {
  name: 'Customer Change',
  key: 'customer_change',
  description:
    'Triggers when a new customer registers or an existing customer profile is updated. Polls the customer list and detects changes based on update timestamps.'
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID'),
      email: z.string().optional().describe('Customer email'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      isNew: z.boolean().describe('Whether this is a newly registered customer')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Customer ID'),
      email: z.string().optional().describe('Customer email'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      middlename: z.string().optional().describe('Middle name'),
      groupId: z.number().optional().describe('Customer group ID'),
      storeId: z.number().optional().describe('Store ID'),
      websiteId: z.number().optional().describe('Website ID'),
      createdAt: z.string().optional().describe('Account creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds * 2
    },

    pollEvents: async ctx => {
      let client = new MagentoClient({
        storeUrl: ctx.config.storeUrl,
        storeCode: ctx.config.storeCode,
        token: ctx.auth.token
      });

      let state = ctx.state as {
        lastUpdatedAt?: string;
        knownCustomers?: Record<string, string>;
      } | null;
      let lastUpdatedAt = state?.lastUpdatedAt;
      let knownCustomers = state?.knownCustomers || {};

      let filters: Array<{ field: string; value: string; conditionType?: string }> = [];
      if (lastUpdatedAt) {
        filters.push({ field: 'updated_at', value: lastUpdatedAt, conditionType: 'gt' });
      }

      let result = await client.searchCustomers({
        filters,
        sortField: 'updated_at',
        sortDirection: 'ASC',
        pageSize: 50
      });

      let inputs: Array<{
        customerId: number;
        email?: string;
        firstname?: string;
        lastname?: string;
        createdAt?: string;
        updatedAt?: string;
        isNew: boolean;
      }> = [];

      let newLastUpdatedAt = lastUpdatedAt;
      let updatedKnown = { ...knownCustomers };

      for (let customer of result.items) {
        let customerIdStr = String(customer.id);
        let previousUpdatedAt = knownCustomers[customerIdStr];
        let isNew = previousUpdatedAt === undefined;

        if (previousUpdatedAt !== undefined && previousUpdatedAt === customer.updated_at) {
          continue;
        }

        inputs.push({
          customerId: customer.id!,
          email: customer.email,
          firstname: customer.firstname,
          lastname: customer.lastname,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at,
          isNew
        });

        updatedKnown[customerIdStr] = customer.updated_at || '';
        if (
          customer.updated_at &&
          (!newLastUpdatedAt || customer.updated_at > newLastUpdatedAt)
        ) {
          newLastUpdatedAt = customer.updated_at;
        }
      }

      return {
        inputs,
        updatedState: {
          lastUpdatedAt: newLastUpdatedAt,
          knownCustomers: updatedKnown
        }
      };
    },

    handleEvent: async ctx => {
      let client = new MagentoClient({
        storeUrl: ctx.config.storeUrl,
        storeCode: ctx.config.storeCode,
        token: ctx.auth.token
      });

      let fullCustomer: any = {};
      try {
        fullCustomer = await client.getCustomer(ctx.input.customerId);
      } catch {
        // Use data from poll if full fetch fails
      }

      let eventType = ctx.input.isNew ? 'customer.created' : 'customer.updated';

      return {
        type: eventType,
        id: `customer-${ctx.input.customerId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          customerId: ctx.input.customerId,
          email: ctx.input.email || fullCustomer.email,
          firstname: ctx.input.firstname || fullCustomer.firstname,
          lastname: ctx.input.lastname || fullCustomer.lastname,
          middlename: fullCustomer.middlename,
          groupId: fullCustomer.group_id,
          storeId: fullCustomer.store_id,
          websiteId: fullCustomer.website_id,
          createdAt: ctx.input.createdAt || fullCustomer.created_at,
          updatedAt: ctx.input.updatedAt || fullCustomer.updated_at
        }
      };
    }
  })
  .build();
