import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeapClient } from '../lib/client';
import { spec } from '../spec';

let userPropertiesItemSchema = z.object({
  identity: z
    .string()
    .describe('User identity (e.g., email address). Case-sensitive, max 255 characters.'),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .describe(
      'Key-value pairs to attach to the user. Keys under 512 chars, values under 1024 chars.'
    )
});

export let manageUserProperties = SlateTool.create(spec, {
  name: 'Manage User Properties',
  key: 'manage_user_properties',
  description: `Attach custom properties to user profiles in Heap. Supports both single user and bulk updates (up to 1000 users per request).
Use this to enrich user profiles with data from your database, demographic info, or other attributes not automatically captured by Heap.
Properties can be set without an existing session, making this ideal for backfilling historical data.`,
  instructions: [
    'For a single user, provide **identity** and **properties** at the top level.',
    'For bulk updates, use the **users** array.',
    'To populate the built-in Email property, use lowercase **"email"** as the key.'
  ],
  constraints: [
    'Rate limited to 30 requests per 30 seconds per identity per app_id.',
    'Bulk: Max 1000 users per request.',
    'Property keys cannot use variations of "id" (ID, Id, iD) as they conflict with internal variables.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identity: z.string().optional().describe('User identity for a single update.'),
      properties: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Properties for a single user update.'),
      users: z
        .array(userPropertiesItemSchema)
        .optional()
        .describe('Array of users for bulk property updates. Max 1000 users per request.')
    })
  )
  .output(
    z.object({
      updated: z.number().describe('Number of users whose properties were updated.'),
      mode: z
        .enum(['single', 'bulk'])
        .describe('Whether the request was processed as a single or bulk update.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeapClient({
      appId: ctx.auth.appId,
      apiKey: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    if (ctx.input.users && ctx.input.users.length > 0) {
      ctx.info(`Bulk updating properties for ${ctx.input.users.length} users`);
      await client.bulkAddUserProperties(ctx.input.users);

      return {
        output: {
          updated: ctx.input.users.length,
          mode: 'bulk' as const
        },
        message: `Successfully updated properties for **${ctx.input.users.length}** users in Heap.`
      };
    }

    if (!ctx.input.identity || !ctx.input.properties) {
      throw new Error(
        'Either provide "identity" and "properties" for a single update, or "users" array for bulk updates.'
      );
    }

    ctx.info(`Updating properties for user: ${ctx.input.identity}`);
    await client.addUserProperties({
      identity: ctx.input.identity,
      properties: ctx.input.properties
    });

    return {
      output: {
        updated: 1,
        mode: 'single' as const
      },
      message: `Successfully updated properties for user **"${ctx.input.identity}"**.`
    };
  })
  .build();
