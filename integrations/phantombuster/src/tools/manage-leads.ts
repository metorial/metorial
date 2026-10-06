import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, collection, identifier, number, type Row } from '../lib/client';
import { spec } from '../spec';

export let manageLeads = SlateTool.create(spec, {
  name: 'Manage Leads',
  key: 'manage_leads',
  tags: { readOnly: false, destructive: true },
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
      paginationOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Provider pagination options for fetching; limit and offset remain available as convenience fields.'
        ),
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
      deletedCount: z
        .number()
        .optional()
        .describe('Provider-reported number of leads deleted, when returned'),
      leadIds: z
        .array(z.string())
        .optional()
        .describe('Provider-returned saved lead IDs, when returned'),
      saveResult: z
        .any()
        .optional()
        .describe('Provider save receipt, with credential fields omitted'),
      pagination: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider pagination metadata when returned'),
      actionPerformed: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'fetch') {
      if (!ctx.input.listId) throw createApiServiceError('listId is required for fetch.');
      const result = await client.fetchLeadsByList(ctx.input.listId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        paginationOptions: ctx.input.paginationOptions
      });
      const leads = collection(result, 'lead', 'leads');
      const pagination =
        isApiErrorRecord(result) && isApiErrorRecord(result.pagination)
          ? result.pagination
          : undefined;
      return {
        output: { leads, pagination, actionPerformed: 'fetch' },
        message: `Fetched **${leads.length}** lead records from the requested list. This is one response page.`
      };
    }
    if (ctx.input.action === 'save') {
      if (!ctx.input.leads?.length || ctx.input.leads.length > 20)
        throw createApiServiceError('Provide between 1 and 20 lead records.');
      if (
        ctx.input.leads.some(
          lead =>
            typeof lead.linkedinProfileUrl !== 'string' || !lead.linkedinProfileUrl.trim()
        )
      )
        throw createApiServiceError(
          'Each lead requires linkedinProfileUrl. Saving records does not launch a scraper.'
        );
      const result =
        ctx.input.leads.length === 1
          ? await client.saveLead(ctx.input.leads[0]!)
          : await client.saveLeadsMany(ctx.input.leads);
      const returned = Array.isArray(result)
        ? result
        : isApiErrorRecord(result) && Array.isArray(result.leads)
          ? result.leads
          : undefined;
      const leads = returned?.every(isApiErrorRecord)
        ? (returned as Row[])
        : isApiErrorRecord(result) && result.linkedinProfileUrl !== undefined
          ? [result]
          : undefined;
      const rawIds =
        isApiErrorRecord(result) && Array.isArray(result.ids)
          ? result.ids
          : Array.isArray(result) &&
              result.every(item => typeof item === 'string' || typeof item === 'number')
            ? result
            : (leads?.map(lead => lead.id).filter(id => id !== undefined) ??
              (isApiErrorRecord(result) && result.id !== undefined ? [result.id] : undefined));
      const leadIds = rawIds?.map(id => identifier(id, 'Saved lead ID'));
      return {
        output: { leads, leadIds, saveResult: result, actionPerformed: 'save' },
        message:
          'PhantomBuster accepted the lead save. Read the records back from the controlled list to confirm their values.'
      };
    }
    if (!ctx.input.leadIdsToDelete?.length)
      throw createApiServiceError('leadIdsToDelete is required for delete.');
    const result = await client.deleteLeadsMany(ctx.input.leadIdsToDelete);
    const count = isApiErrorRecord(result) ? number(result.deletedCount) : undefined;
    return {
      output: { deletedCount: count, actionPerformed: 'delete' },
      message:
        'PhantomBuster accepted the lead deletion. Read the controlled list back to confirm removal.'
    };
  })
  .build();
