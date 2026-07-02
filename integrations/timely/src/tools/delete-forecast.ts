import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteForecast = SlateTool.create(spec, {
  name: 'Delete Forecast',
  key: 'delete_forecast',
  description: `Permanently delete a forecast (planned task) from Timely. This cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      forecastId: z.string().describe('ID of the forecast to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    await client.deleteForecast(ctx.input.forecastId);

    return {
      output: { deleted: true },
      message: `Deleted forecast **#${ctx.input.forecastId}**.`
    };
  })
  .build();
