import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setUserStatus = SlateTool.create(spec, {
  name: 'Set User Status',
  key: 'set_user_status',
  description: `Set the authenticated user's status, including status text and emoji. Useful for indicating availability or current activity.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      statusText: z
        .string()
        .optional()
        .describe('Status text to display. Pass empty string to clear'),
      emoji: z
        .string()
        .optional()
        .describe(
          'Status emoji name (e.g., "car", "working_on_it"). Pass empty string to clear'
        ),
      away: z.boolean().optional().describe('Whether to mark the user as away')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the status was updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    await client.setUserStatus({
      statusText: ctx.input.statusText,
      emoji: ctx.input.emoji,
      away: ctx.input.away
    });

    return {
      output: { success: true },
      message: `User status updated successfully`
    };
  })
  .build();
