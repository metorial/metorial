import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConferences = SlateTool.create(spec, {
  name: 'List Conferences',
  key: 'list_conferences',
  description: `Retrieves a list of conference rooms (meetings and webinars) from the account. Rooms can be filtered by status. Conference rooms inactive for more than 6 months are automatically archived.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'inactive'])
        .default('active')
        .describe('Filter conferences by status')
    })
  )
  .output(
    z.object({
      conferences: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of conference room objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let conferences = await client.listConferences(ctx.input.status);
    let list = Array.isArray(conferences) ? conferences : [];

    return {
      output: { conferences: list },
      message: `Found **${list.length}** ${ctx.input.status} conference(s).`
    };
  })
  .build();
