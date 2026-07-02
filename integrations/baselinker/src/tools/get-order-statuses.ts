import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let getOrderStatuses = SlateTool.create(spec, {
  name: 'Get Order Statuses',
  key: 'get_order_statuses',
  description: `Retrieve all available order statuses and order sources configured in the BaseLinker account. Returns both the status list (with IDs, names, and colors) and order sources (grouped by type). Useful for mapping status IDs when creating or updating orders.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      statuses: z
        .array(
          z.object({
            statusId: z.number().describe('Status identifier'),
            name: z.string().describe('Status name'),
            nameForCustomer: z.string().describe('Customer-facing status name'),
            color: z.string().describe('Status color as hex')
          })
        )
        .describe('Available order statuses'),
      sources: z.any().describe('Order sources grouped by type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    let [statusResult, sourcesResult] = await Promise.all([
      client.getOrderStatusList(),
      client.getOrderSources()
    ]);

    let statuses = (statusResult.statuses || []).map((s: any) => ({
      statusId: s.id,
      name: s.name || '',
      nameForCustomer: s.name_for_customer || '',
      color: s.color || ''
    }));

    return {
      output: {
        statuses,
        sources: sourcesResult.sources || {}
      },
      message: `Retrieved **${statuses.length}** order statuses.`
    };
  })
  .build();
