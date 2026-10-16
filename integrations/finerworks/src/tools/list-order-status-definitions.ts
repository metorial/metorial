import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requiredArray, requiredNumber, requiredString } from '../lib/client';
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
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
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

    let definitions = requiredArray(data.definitions, 'definitions').map((d: any) => ({
      orderStatusId: requiredNumber(d.order_status_id, 'order_status_id'),
      orderStatusLabel: requiredString(d.order_status_label, 'order_status_label')
    }));

    return {
      output: { definitions, raw: data },
      message: `Found **${definitions.length}** status definitions: ${definitions.map((d: any) => `${d.orderStatusId} = "${d.orderStatusLabel}"`).join(', ')}`
    };
  })
  .build();
