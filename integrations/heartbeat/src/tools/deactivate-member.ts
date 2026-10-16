import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deactivateMember = SlateTool.create(spec, {
  name: 'Deactivate Member',
  key: 'deactivate_member',
  description: `Deactivates a user in your Heartbeat community. The user will no longer be able to access the community, but their threads, comments, and messages are preserved. Can also reactivate a previously deactivated user.`,
  instructions: [
    'The API requires an email. The tool looks up the supplied user ID with the same API key before changing access; a failed lookup stops the request before any mutation.',
    'To reactivate a previously deactivated user, set the "reactivate" parameter to true.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to deactivate or reactivate'),
      reactivate: z
        .boolean()
        .optional()
        .describe('If true, reactivates a previously deactivated user instead of deactivating')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the affected user'),
      action: z.string().describe('Action performed: "deactivated" or "reactivated"'),
      raw: z.unknown().optional().describe('Complete provider mutation response, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.reactivate) {
      let response = await client.reactivateUser(ctx.input.userId);
      return {
        output: {
          userId: ctx.input.userId,
          action: 'reactivated',
          raw: response
        },
        message: `Reactivated member with ID **${ctx.input.userId}**.`
      };
    }

    let response = await client.deleteUser(ctx.input.userId);
    return {
      output: {
        userId: ctx.input.userId,
        action: 'deactivated',
        raw: response
      },
      message: `Deactivated member with ID **${ctx.input.userId}**. Their content has been preserved.`
    };
  })
  .build();
