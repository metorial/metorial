import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let listStorms = SlateTool.create(spec, {
  name: 'List Storms',
  key: 'list_storms',
  description: `Retrieve a list of all Storms accessible to the authenticated user. Returns Storm titles, IDs, goals, and last activity timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      storms: z
        .array(
          z.object({
            stormId: z.number().describe('Unique Storm ID'),
            key: z.string().optional().describe('Storm key'),
            title: z.string().describe('Storm title'),
            goals: z.string().optional().describe('Storm goals and description'),
            lastActivity: z.string().optional().describe('Last activity timestamp in ISO 8601')
          })
        )
        .describe('List of Storms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let storms = await client.listStorms();

    let result = Array.isArray(storms) ? storms : [];

    return {
      output: {
        storms: result.map((s: any) => ({
          stormId: s.id,
          key: s.key,
          title: s.title,
          goals: s.goals,
          lastActivity: s.lastactivity
        }))
      },
      message: `Found **${result.length}** Storm(s).`
    };
  })
  .build();
