import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClient = SlateTool.create(spec, {
  name: 'Manage Client',
  key: 'manage_client',
  description: `Create, update, or delete a client record in Hub Planner. Clients can be associated with projects.
When creating, **name** is required.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      clientId: z.string().optional().describe('Client ID, required for update and delete'),
      name: z.string().optional().describe('Client name, required for create'),
      metadata: z
        .string()
        .optional()
        .describe(
          'Custom metadata. Supported when creating a client; updates only support name.'
        )
    })
  )
  .output(
    z.object({
      clientId: z.string().optional().describe('Client ID'),
      name: z.string().optional().describe('Client name'),
      metadata: z.string().optional().describe('Custom metadata'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, clientId, ...fields } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name?.trim()) {
        throw createApiServiceError('name is required for create.');
      }
      let result = await client.createClient(fields);
      return {
        output: {
          clientId: result._id,
          name: result.name ?? undefined,
          metadata: result.metadata ?? undefined,
          createdDate: result.createdDate ?? undefined,
          updatedDate: result.updatedDate ?? undefined
        },
        message: `Created client **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (action === 'update') {
      if (!clientId) throw createApiServiceError('clientId is required for update');
      if (!fields.name?.trim()) throw createApiServiceError('name is required for update.');
      if (fields.metadata !== undefined) {
        throw createApiServiceError(
          'Hub Planner only supports updating the client name. Omit metadata for update.'
        );
      }
      let result = await client.updateClient(clientId, { name: fields.name });
      return {
        output: {
          clientId: result._id,
          name: result.name ?? undefined,
          metadata: result.metadata ?? undefined,
          createdDate: result.createdDate ?? undefined,
          updatedDate: result.updatedDate ?? undefined
        },
        message: `Updated client **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (!clientId) throw createApiServiceError('clientId is required for delete');
    await client.deleteClient(clientId);
    return {
      output: { clientId },
      message: `Deleted client \`${clientId}\`.`
    };
  })
  .build();
