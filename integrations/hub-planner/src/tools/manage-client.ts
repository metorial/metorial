import { SlateTool } from 'slates';
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
      metadata: z.string().optional().describe('Custom metadata')
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
      let result = await client.createClient(fields);
      return {
        output: {
          clientId: result._id,
          name: result.name,
          metadata: result.metadata,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created client **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (action === 'update') {
      if (!clientId) throw new Error('clientId is required for update');
      let existing = await client.getClient(clientId);
      let result = await client.updateClient(clientId, { ...existing, ...fields });
      return {
        output: {
          clientId: result._id,
          name: result.name,
          metadata: result.metadata,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Updated client **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (!clientId) throw new Error('clientId is required for delete');
    await client.deleteClient(clientId);
    return {
      output: { clientId },
      message: `Deleted client \`${clientId}\`.`
    };
  })
  .build();
