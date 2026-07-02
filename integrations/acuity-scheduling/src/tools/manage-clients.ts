import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientSchema = z.object({
  clientId: z.number().describe('Client ID'),
  firstName: z.string().describe('Client first name'),
  lastName: z.string().describe('Client last name'),
  email: z.string().optional().describe('Client email address'),
  phone: z.string().optional().describe('Client phone number'),
  notes: z.string().optional().describe('Client notes')
});

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Search and retrieve client records. Filter by name, email, or phone number, or use a general search query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('General search query across client records'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      email: z.string().optional().describe('Filter by email address'),
      phone: z.string().optional().describe('Filter by phone number')
    })
  )
  .output(
    z.object({
      clients: z.array(clientSchema).describe('List of clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listClients({
      search: ctx.input.search,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone
    });

    let clients = (results as any[]).map((c: any) => ({
      clientId: c.id,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      email: c.email || undefined,
      phone: c.phone || undefined,
      notes: c.notes || undefined
    }));

    return {
      output: { clients },
      message: `Found **${clients.length}** client(s).`
    };
  })
  .build();

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client record with contact information.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().optional().describe('Client email address'),
      phone: z.string().optional().describe('Client phone number'),
      notes: z.string().optional().describe('Notes about the client')
    })
  )
  .output(clientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let c = await client.createClient({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      notes: ctx.input.notes
    });

    return {
      output: {
        clientId: c.id,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        email: c.email || undefined,
        phone: c.phone || undefined,
        notes: c.notes || undefined
      },
      message: `Client **${c.firstName} ${c.lastName}** created with ID **#${c.id}**.`
    };
  })
  .build();

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client's contact information or notes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      clientId: z.number().describe('The ID of the client to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      notes: z.string().optional().describe('Updated notes')
    })
  )
  .output(clientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) updateData.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updateData.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
    if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
    if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;

    let c = await client.updateClient(ctx.input.clientId, updateData);

    return {
      output: {
        clientId: c.id,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        email: c.email || undefined,
        phone: c.phone || undefined,
        notes: c.notes || undefined
      },
      message: `Client **#${c.id}** updated.`
    };
  })
  .build();

export let deleteClient = SlateTool.create(spec, {
  name: 'Delete Client',
  key: 'delete_client',
  description: `Permanently delete a client record.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      clientId: z.number().describe('The ID of the client to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the client was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    await client.deleteClient(ctx.input.clientId);

    return {
      output: { success: true },
      message: `Client **#${ctx.input.clientId}** deleted.`
    };
  })
  .build();
