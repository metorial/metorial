import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let manageClient = SlateTool.create(spec, {
  name: 'Manage Client',
  key: 'manage_client',
  description: `Create or update a client in Timely. Provide a **clientId** to update an existing client, or omit it to create a new one. Set **active** to false to archive a client.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      clientId: z
        .string()
        .optional()
        .describe('Client ID to update. Omit to create a new client'),
      name: z.string().describe('Client name (required for creation)'),
      color: z.string().optional().describe('Color hex code (e.g., "ffb74d")'),
      externalId: z
        .string()
        .optional()
        .describe('External reference ID for cross-system linking'),
      active: z.boolean().optional().describe('Set to false to archive the client')
    })
  )
  .output(
    z.object({
      clientId: z.number().describe('Client ID'),
      name: z.string().describe('Client name'),
      color: z.string().nullable().describe('Color hex code'),
      active: z.boolean().describe('Whether the client is active'),
      externalId: z.string().nullable().describe('External reference ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let result: any;
    let action: string;

    if (ctx.input.clientId) {
      result = await client.updateClient(ctx.input.clientId, {
        name: ctx.input.name,
        color: ctx.input.color,
        externalId: ctx.input.externalId,
        active: ctx.input.active
      });
      action = 'Updated';
    } else {
      result = await client.createClient({
        name: ctx.input.name,
        color: ctx.input.color,
        externalId: ctx.input.externalId,
        active: ctx.input.active
      });
      action = 'Created';
    }

    return {
      output: {
        clientId: result.id,
        name: result.name,
        color: result.color ?? null,
        active: result.active ?? true,
        externalId: result.external_id ?? null
      },
      message: `${action} client **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
