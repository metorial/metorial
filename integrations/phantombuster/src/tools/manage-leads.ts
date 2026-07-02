import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeads = SlateTool.create(spec, {
  name: 'Manage Leads',
  key: 'manage_leads',
  description: `Fetch, save, or delete leads in the LinkedIn Leads database.
- **Fetch**: Retrieve leads from a specific list by providing a \`listId\`.
- **Save**: Add or update one or more leads by providing the \`leads\` array.
- **Delete**: Remove leads by providing \`leadIdsToDelete\`.`,
  instructions: [
    'To fetch leads, provide a listId. Optionally use limit and offset for pagination.',
    'To save leads, provide the leads array with the lead data.',
    'To delete leads, provide the leadIdsToDelete array.'
  ]
})
  .input(
    z.object({
      action: z.enum(['fetch', 'save', 'delete']).describe('Action to perform on leads'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list to fetch leads from (required for "fetch" action)'),
      limit: z.number().optional().describe('Maximum number of leads to return when fetching'),
      offset: z.number().optional().describe('Number of leads to skip when fetching'),
      leads: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of lead objects to save (required for "save" action)'),
      leadIdsToDelete: z
        .array(z.string())
        .optional()
        .describe('Array of lead IDs to delete (required for "delete" action)')
    })
  )
  .output(
    z.object({
      leads: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Retrieved or saved leads'),
      deletedCount: z.number().optional().describe('Number of leads deleted'),
      actionPerformed: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'fetch') {
      if (!ctx.input.listId) {
        throw new Error('listId is required for the "fetch" action');
      }
      let result = await client.fetchLeadsByList(ctx.input.listId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let leads = Array.isArray(result) ? result : (result?.leads ?? []);
      return {
        output: {
          leads,
          actionPerformed: 'fetch'
        },
        message: `Fetched **${leads.length}** lead(s) from list **${ctx.input.listId}**.`
      };
    }

    if (ctx.input.action === 'save') {
      if (!ctx.input.leads || ctx.input.leads.length === 0) {
        throw new Error('leads array is required for the "save" action');
      }
      let _result: any;
      if (ctx.input.leads.length === 1) {
        _result = await client.saveLead(ctx.input.leads[0]!);
      } else {
        _result = await client.saveLeadsMany(ctx.input.leads);
      }
      return {
        output: {
          leads: ctx.input.leads,
          actionPerformed: 'save'
        },
        message: `Saved **${ctx.input.leads.length}** lead(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.leadIdsToDelete || ctx.input.leadIdsToDelete.length === 0) {
        throw new Error('leadIdsToDelete array is required for the "delete" action');
      }
      await client.deleteLeadsMany(ctx.input.leadIdsToDelete);
      return {
        output: {
          deletedCount: ctx.input.leadIdsToDelete.length,
          actionPerformed: 'delete'
        },
        message: `Deleted **${ctx.input.leadIdsToDelete.length}** lead(s).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
