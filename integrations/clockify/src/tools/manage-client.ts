import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientOutputSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  email: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
  archived: z.boolean()
});

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client in the Clockify workspace. Clients can be associated with projects for billing and reporting.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Client name'),
      email: z.string().optional().describe('Client email address'),
      address: z.string().optional().describe('Client address'),
      note: z.string().optional().describe('Notes about the client')
    })
  )
  .output(clientOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let result = await client.createClient({
      name: ctx.input.name,
      email: ctx.input.email,
      address: ctx.input.address,
      note: ctx.input.note
    });

    return {
      output: {
        clientId: result.id,
        name: result.name,
        email: result.email || undefined,
        address: result.address || undefined,
        note: result.note || undefined,
        archived: result.archived ?? false
      },
      message: `Created client **${result.name}**.`
    };
  })
  .build();

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client in Clockify. Modify name, email, address, notes, or archive status.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      clientId: z.string().describe('ID of the client to update'),
      name: z.string().optional().describe('Updated name'),
      email: z.string().optional().describe('Updated email'),
      address: z.string().optional().describe('Updated address'),
      note: z.string().optional().describe('Updated notes'),
      archived: z.boolean().optional().describe('Archive/unarchive the client')
    })
  )
  .output(clientOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let result = await client.updateClient(ctx.input.clientId, {
      name: ctx.input.name,
      email: ctx.input.email,
      address: ctx.input.address,
      note: ctx.input.note,
      archived: ctx.input.archived
    });

    return {
      output: {
        clientId: result.id,
        name: result.name,
        email: result.email || undefined,
        address: result.address || undefined,
        note: result.note || undefined,
        archived: result.archived ?? false
      },
      message: `Updated client **${result.name}**.`
    };
  })
  .build();

export let deleteClient = SlateTool.create(spec, {
  name: 'Delete Client',
  key: 'delete_client',
  description: `Delete a client from the Clockify workspace.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      clientId: z.string().describe('ID of the client to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    await client.deleteClient(ctx.input.clientId);

    return {
      output: { deleted: true },
      message: `Deleted client **${ctx.input.clientId}**.`
    };
  })
  .build();

export let getClients = SlateTool.create(spec, {
  name: 'Get Clients',
  key: 'get_clients',
  description: `List clients in the Clockify workspace. Filter by name or archived status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by client name (partial match)'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Entries per page')
    })
  )
  .output(
    z.object({
      clients: z.array(clientOutputSchema),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let results = await client.getClients({
      name: ctx.input.name,
      archived: ctx.input.archived,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (results as any[]).map((c: any) => ({
      clientId: c.id,
      name: c.name,
      email: c.email || undefined,
      address: c.address || undefined,
      note: c.note || undefined,
      archived: c.archived ?? false
    }));

    return {
      output: { clients: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** clients.`
    };
  })
  .build();
