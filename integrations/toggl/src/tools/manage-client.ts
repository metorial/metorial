import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

let clientOutputSchema = z.object({
  clientId: z.number().describe('Client ID'),
  name: z.string().describe('Client name'),
  workspaceId: z.number().describe('Workspace ID'),
  archived: z.boolean().describe('Whether the client is archived'),
  notes: z.string().nullable().describe('Notes about the client'),
  createdAt: z.string().describe('Creation timestamp')
});

export let manageClient = SlateTool.create(spec, {
  name: 'Manage Client',
  key: 'manage_client',
  description: `Create, update, or delete a client in Toggl Track. Clients serve as a grouping mechanism for projects and are useful for billing and reporting.
To **create**: provide a name. To **update**: provide a clientId and fields to change. To **delete**: provide a clientId and set \`delete\` to true.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      clientId: z
        .string()
        .optional()
        .describe('Client ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the client'),
      name: z.string().optional().describe('Client name (required for create)'),
      notes: z.string().optional().describe('Notes about the client')
    })
  )
  .output(
    z.object({
      client: clientOutputSchema
        .nullable()
        .describe('The created/updated client, null if deleted'),
      deleted: z.boolean().describe('Whether a client was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let togglClient = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    if (ctx.input.delete && ctx.input.clientId) {
      await togglClient.deleteClient(wsId, ctx.input.clientId);
      return {
        output: { client: null, deleted: true },
        message: `Deleted client **#${ctx.input.clientId}**`
      };
    }

    let result: any;
    if (ctx.input.clientId) {
      result = await togglClient.updateClient(wsId, ctx.input.clientId, {
        name: ctx.input.name,
        notes: ctx.input.notes
      });
    } else {
      if (!ctx.input.name)
        throw new Error('Client name is required when creating a new client.');
      result = await togglClient.createClient(wsId, {
        name: ctx.input.name,
        notes: ctx.input.notes
      });
    }

    let mapped = {
      clientId: result.id,
      name: result.name,
      workspaceId: result.wid ?? result.workspace_id,
      archived: result.archived ?? false,
      notes: result.notes ?? null,
      createdAt: result.created_at ?? result.at
    };

    return {
      output: { client: mapped, deleted: false },
      message: ctx.input.clientId
        ? `Updated client **${result.name}**`
        : `Created client **${result.name}**`
    };
  })
  .build();
