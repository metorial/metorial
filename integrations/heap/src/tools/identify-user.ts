import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeapClient } from '../lib/client';
import { spec } from '../spec';

export let identifyUser = SlateTool.create(spec, {
  name: 'Identify User',
  key: 'identify_user',
  description: `Link an anonymous Heap user ID to a known identity (e.g., email address), merging their activity history into a single user profile.
This enables cross-session, cross-device, and cross-browser user tracking under one unified profile.`,
  instructions: [
    'Both **userId** (anonymous Heap SDK user ID) and **identity** (known user identifier) are required.',
    'An identity cannot be changed once applied to a user.',
    'Multiple user IDs can be mapped to one identity (up to 10 per month), but only one identity can be mapped to a user ID.'
  ],
  constraints: [
    'Only 1 identity can be mapped to a user_id.',
    'Up to 10 user_ids can be mapped to an identity within a one-month period.',
    'Identity is case-sensitive and limited to 255 characters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe(
          'The anonymous Heap user ID from the SDK. Must be a string representation of a number between 0 and 2^53 - 1.'
        ),
      identity: z
        .string()
        .describe(
          'The known user identity to associate (e.g., email address). Case-sensitive, max 255 characters.'
        ),
      timestamp: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp for when the identification occurred. Defaults to current time.'
        )
    })
  )
  .output(
    z.object({
      identified: z
        .boolean()
        .describe('Whether the identification request was successfully sent.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeapClient({
      appId: ctx.auth.appId,
      apiKey: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    ctx.info(`Identifying user ${ctx.input.userId} as ${ctx.input.identity}`);
    await client.identifyUser({
      userId: ctx.input.userId,
      identity: ctx.input.identity,
      timestamp: ctx.input.timestamp
    });

    return {
      output: {
        identified: true
      },
      message: `Successfully identified Heap user **${ctx.input.userId}** as **"${ctx.input.identity}"**.`
    };
  })
  .build();
