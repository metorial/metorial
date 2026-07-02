import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let customerChanges = SlateTrigger.create(spec, {
  name: 'Customer Changes',
  key: 'customer_changes',
  description:
    'Triggers when customers are created or modified in Firmao. Polls for recently modified customer records.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      customerId: z.number().describe('ID of the changed customer'),
      raw: z.any().describe('Full customer record from the API')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      name: z.string(),
      label: z.string().optional(),
      customerType: z.string().optional(),
      nipNumber: z.string().optional(),
      emails: z.array(z.string()).optional(),
      phones: z.array(z.string()).optional(),
      website: z.string().optional(),
      creationDate: z.string().optional(),
      lastModificationDate: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FirmaoClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let filters: Record<string, string> = {};
      if (lastPollTime) {
        filters['lastModificationDate(gt)'] = lastPollTime;
      }

      let result = await client.list('customers', {
        sort: 'lastModificationDate',
        dir: 'DESC',
        limit: 50,
        filters
      });

      let now = new Date().toISOString();

      let inputs = result.data.map((c: any) => {
        let isNew =
          !lastPollTime || (c.creationDate && c.creationDate === c.lastModificationDate);
        return {
          changeType: isNew ? ('created' as const) : ('updated' as const),
          customerId: c.id,
          raw: c
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime:
            result.data.length > 0
              ? (result.data[0].lastModificationDate ?? now)
              : (lastPollTime ?? now)
        }
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.raw;
      return {
        type: `customer.${ctx.input.changeType}`,
        id: `customer-${ctx.input.customerId}-${c.lastModificationDate ?? Date.now()}`,
        output: {
          customerId: ctx.input.customerId,
          name: c.name,
          label: c.label,
          customerType: c.customerType,
          nipNumber: c.nipNumber,
          emails: c.emails,
          phones: c.phones,
          website: c.website,
          creationDate: c.creationDate,
          lastModificationDate: c.lastModificationDate
        }
      };
    }
  })
  .build();
