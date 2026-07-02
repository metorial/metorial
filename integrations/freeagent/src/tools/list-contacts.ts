import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a list of contacts (customers, suppliers, etc.) from FreeAgent. Supports filtering by status, sorting, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum([
          'all',
          'active',
          'clients',
          'suppliers',
          'active_projects',
          'completed_projects',
          'open_clients',
          'open_suppliers',
          'hidden'
        ])
        .optional()
        .describe('Filter contacts by status or type'),
      sort: z
        .enum(['name', '-name', 'created_at', '-created_at', 'updated_at', '-updated_at'])
        .optional()
        .describe('Sort order. Prefix with - for descending.'),
      updatedSince: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp. Only return contacts updated after this time.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.any())).describe('List of contact records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let contacts = await client.listContacts(ctx.input);
    let count = contacts.length;

    return {
      output: { contacts },
      message: `Found **${count}** contact${count !== 1 ? 's' : ''}${ctx.input.view ? ` (view: ${ctx.input.view})` : ''}.`
    };
  })
  .build();
