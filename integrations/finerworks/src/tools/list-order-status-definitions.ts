import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrderStatusDefinitions = SlateTool.create(spec, {
  name: 'List Order Status Definitions',
  key: 'list_order_status_definitions',
  description: `Retrieve all available order production status definitions from FinerWorks. Returns the complete list of status IDs and their labels for reference when interpreting order statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      definitions: z
        .array(
          z.object({
            orderStatusId: z.number().describe('Numeric status ID'),
            orderStatusLabel: z.string().describe('Human-readable status label')
          })
        )
        .describe('All available order status definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.listOrderStatusDefinitions();

    if (!data.status?.success) {
      throw new Error(data.status?.message || 'Failed to fetch status definitions');
    }

    let definitions = (data.definitions ?? []).map((d: any) => ({
      orderStatusId: d.order_status_id,
      orderStatusLabel: d.order_status_label ?? ''
    }));

    return {
      output: { definitions },
      message: `Found **${definitions.length}** status definitions: ${definitions.map((d: any) => `${d.orderStatusId} = "${d.orderStatusLabel}"`).join(', ')}`
    };
  })
  .build();
