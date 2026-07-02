import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSalesStatus = SlateTool.create(spec, {
  name: 'Update Sales Status',
  key: 'update_sales_status',
  description: `Update the sales status of a customer session. Enables pipeline tracking tied to the original traffic source, so you can see which marketing channels drive conversions through each sales stage.`
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID of the customer to update'),
      salesStatus: z.string().describe('New sales status value for the customer session')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the sales status was successfully updated'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateSalesStatus(ctx.input.sessionId, ctx.input.salesStatus);

    return {
      output: {
        success: true,
        result
      },
      message: `Updated sales status to **"${ctx.input.salesStatus}"** for session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();
