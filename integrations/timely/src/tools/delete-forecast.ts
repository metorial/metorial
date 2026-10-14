import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteForecast = SlateTool.create(spec, {
  name: 'Delete Forecast',
  key: 'delete_forecast',
  description: `Call list_accounts to choose a workspace when needed. Permanently delete a forecast (planned task) from Timely. This cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      forecastId: z.string().describe('ID of the forecast to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createTimelyClient(ctx);

    await client.deleteForecast(ctx.input.forecastId);

    return {
      output: { deleted: true },
      message: `Deleted forecast **#${ctx.input.forecastId}**.`
    };
  })
  .build();
