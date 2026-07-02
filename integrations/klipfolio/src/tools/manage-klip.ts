import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageKlip = SlateTool.create(spec, {
  name: 'Manage Klip',
  key: 'manage_klip',
  description: `Create, update, or delete a Klip (visualization component). When creating, provide a name and optional schema. When updating, provide the klip ID and fields to change. Set **action** to control the operation.`,
  instructions: [
    'Use action "create" to create a new klip, "update" to modify an existing one, or "delete" to remove one.',
    'The schema field is the underlying data mapping configuration for the klip visualization.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      klipId: z.string().optional().describe('Klip ID (required for update and delete)'),
      name: z.string().optional().describe('Klip name (required for create)'),
      description: z.string().optional().describe('Klip description'),
      clientId: z.string().optional().describe('Client ID (for create only)'),
      schema: z.any().optional().describe('Klip schema definition (for create or update)')
    })
  )
  .output(
    z.object({
      klipId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required when creating a klip');

      let result = await client.createKlip({
        name: ctx.input.name,
        description: ctx.input.description,
        clientId: ctx.input.clientId,
        schema: ctx.input.schema
      });

      let location = result?.meta?.location;
      let klipId = location ? location.split('/').pop() : undefined;

      return {
        output: {
          klipId,
          name: ctx.input.name,
          description: ctx.input.description,
          success: true
        },
        message: `Created klip **${ctx.input.name}**${klipId ? ` with ID \`${klipId}\`` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.klipId) throw new Error('klipId is required when updating a klip');

      if (ctx.input.name !== undefined || ctx.input.description !== undefined) {
        await client.updateKlip(ctx.input.klipId, {
          name: ctx.input.name,
          description: ctx.input.description
        });
      }

      if (ctx.input.schema !== undefined) {
        await client.updateKlipSchema(ctx.input.klipId, ctx.input.schema);
      }

      return {
        output: {
          klipId: ctx.input.klipId,
          name: ctx.input.name,
          description: ctx.input.description,
          success: true
        },
        message: `Updated klip \`${ctx.input.klipId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.klipId) throw new Error('klipId is required when deleting a klip');

      await client.deleteKlip(ctx.input.klipId);

      return {
        output: { klipId: ctx.input.klipId, success: true },
        message: `Deleted klip \`${ctx.input.klipId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
