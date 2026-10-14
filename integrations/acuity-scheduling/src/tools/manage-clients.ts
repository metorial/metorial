import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientSchema = z.object({
  clientId: z.number().optional().describe('Client ID, when returned by the provider'),
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
      search: z.string().optional().describe('Search first name, last name, or phone number'),
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
      message: `Client **${c.firstName} ${c.lastName}** created.`
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
      clientId: z
        .number()
        .optional()
        .describe(
          'Legacy client ID; Acuity identifies clients by current name and phone instead. Provide currentFirstName and currentLastName.'
        ),
      currentFirstName: z
        .string()
        .optional()
        .describe('Existing first name from list_clients, used to select the client'),
      currentLastName: z
        .string()
        .optional()
        .describe('Existing last name from list_clients, used to select the client'),
      currentPhone: z
        .string()
        .optional()
        .describe(
          'Existing phone number from list_clients, used to distinguish clients sharing a name'
        ),
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

    if (!ctx.input.currentFirstName || !ctx.input.currentLastName) {
      throw createApiServiceError(
        'Acuity identifies clients by name, not numeric ID. Call list_clients and provide currentFirstName and currentLastName, plus currentPhone when needed.'
      );
    }
    let updateData = pickDefined({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      notes: ctx.input.notes
    });
    if (Object.keys(updateData).length === 0) {
      throw createApiServiceError('Provide at least one client field to update.');
    }
    let c = await client.updateClient(
      {
        firstName: ctx.input.currentFirstName,
        lastName: ctx.input.currentLastName,
        phone: ctx.input.currentPhone
      },
      updateData
    );

    return {
      output: {
        clientId: c.id,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        email: c.email || undefined,
        phone: c.phone || undefined,
        notes: c.notes || undefined
      },
      message: `Client **${c.firstName} ${c.lastName}** updated.`
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
      clientId: z
        .number()
        .optional()
        .describe(
          'Legacy client ID; Acuity identifies clients by name and phone instead. Provide firstName and lastName.'
        ),
      firstName: z
        .string()
        .optional()
        .describe('Existing client first name from list_clients'),
      lastName: z.string().optional().describe('Existing client last name from list_clients'),
      phone: z
        .string()
        .optional()
        .describe(
          'Existing client phone from list_clients, to distinguish clients sharing a name'
        )
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

    if (!ctx.input.firstName || !ctx.input.lastName) {
      throw createApiServiceError(
        'Acuity identifies clients by name, not numeric ID. Call list_clients and provide firstName and lastName, plus phone when needed.'
      );
    }
    await client.deleteClient({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      phone: ctx.input.phone
    });

    return {
      output: { success: true },
      message: `Client **${ctx.input.firstName} ${ctx.input.lastName}** deleted.`
    };
  })
  .build();
