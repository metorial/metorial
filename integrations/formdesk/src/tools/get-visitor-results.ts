import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getVisitorResults = SlateTool.create(spec, {
  name: 'Get Visitor Results',
  key: 'get_visitor_results',
  description: `Retrieves all form results associated with a specific visitor across one or more forms. Useful for viewing a visitor's complete submission history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      visitorId: z.string().describe('The unique ID of the visitor'),
      formList: z
        .string()
        .optional()
        .describe('Comma-separated list of form names to limit the search to specific forms')
    })
  )
  .output(
    z.object({
      visitorId: z.string().describe('The ID of the visitor'),
      results: z.any().describe('Results organized by form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Fetching visitor results...');
    let results = await client.getVisitorResults(ctx.input.visitorId, ctx.input.formList);

    return {
      output: {
        visitorId: ctx.input.visitorId,
        results
      },
      message: `Retrieved results for visitor **${ctx.input.visitorId}**.`
    };
  })
  .build();
