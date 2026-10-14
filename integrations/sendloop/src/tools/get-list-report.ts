import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let getListReport = SlateTool.create(spec, {
  name: 'Get List Report',
  key: 'get_list_report',
  description:
    'Retrieve overall performance statistics for a subscriber list, including open and click trends, highest-performing days, and spam complaints. Call get_lists to discover list IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      listId: z.string().describe('Subscriber list ID. Call get_lists to discover lists.')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('List the report describes'),
      statistics: z
        .record(z.string(), z.any())
        .describe('Provider-reported list performance statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || ctx.config.subdomain
    });
    let result = await client.getListOverallReport(ctx.input.listId);
    return {
      output: { listId: ctx.input.listId, statistics: result.Statistics || result },
      message: `Retrieved overall statistics for list **${ctx.input.listId}**.`
    };
  })
  .build();
