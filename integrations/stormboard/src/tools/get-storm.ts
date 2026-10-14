import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let getStorm = SlateTool.create(spec, {
  name: 'Get Storm Details',
  key: 'get_storm',
  description: `Retrieve a Storm's ID, key, title, goals, and last activity timestamp. Use get_storm_template to retrieve its template and sections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm to retrieve')
    })
  )
  .output(
    z.object({
      stormId: z.number().describe('Storm ID'),
      key: z.string().optional().describe('Storm key'),
      title: z.string().describe('Storm title'),
      goals: z.string().optional().describe('Storm goals and description'),
      lastActivity: z.string().optional().describe('Last activity timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let storm = await client.getStorm(ctx.input.stormId);

    return {
      output: {
        stormId: storm.id,
        key: storm.key ?? undefined,
        title: storm.title,
        goals: storm.goals ?? undefined,
        lastActivity: storm.lastactivity ?? undefined
      },
      message: `Retrieved Storm **"${storm.title}"** (ID: ${storm.id}).`
    };
  })
  .build();
