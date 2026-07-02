import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCauses = SlateTool.create(spec, {
  name: 'Get User Causes',
  key: 'get_causes',
  description: `Retrieve the charitable causes a Daffy user cares about. Causes include categories like Education, International, Sports, etc. Can be retrieved for any user by their user ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('User ID to retrieve causes for')
    })
  )
  .output(
    z.object({
      causes: z
        .array(
          z.object({
            causeId: z.number().describe('Unique identifier for the cause'),
            name: z.string().describe('Name of the cause'),
            color: z.string().describe('Hex color associated with the cause'),
            logo: z.string().describe('URL of the cause logo')
          })
        )
        .describe('List of causes the user cares about')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let causes = await client.getUserCauses(ctx.input.userId);

    return {
      output: {
        causes: causes.map(c => ({
          causeId: c.id,
          name: c.name,
          color: c.color,
          logo: c.logo
        }))
      },
      message: `Found **${causes.length}** cause(s) for user ${ctx.input.userId}: ${causes.map(c => c.name).join(', ') || 'none'}.`
    };
  })
  .build();
