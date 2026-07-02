import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let importContacts = SlateTool.create(spec, {
  name: 'Import Contacts',
  key: 'import_contacts',
  description: `Bulk import contacts into Unisender. Provide field names and data rows to import multiple contacts at once. Supports setting list memberships, tags, and custom field values.
The first field name should typically be "email" or "phone". Use "email_list_ids_<LIST_ID>" fields to subscribe contacts to specific lists.`,
  instructions: [
    'fieldNames should include "email" and/or "phone" as well as any custom fields.',
    'Each row in data must have the same number of elements as fieldNames.',
    'Use "email_list_ids_<LIST_ID>" to subscribe contacts to specific lists (value should be empty string or list ID).'
  ]
})
  .input(
    z.object({
      fieldNames: z
        .array(z.string())
        .describe('Ordered list of field names for the data columns'),
      data: z
        .array(z.array(z.string()))
        .describe(
          'Array of rows, each row is an array of field values matching fieldNames order'
        ),
      doubleOptin: z
        .enum(['0', '1', '3'])
        .optional()
        .describe('0=use list default, 1=force double opt-in, 3=skip confirmation'),
      overwriteTags: z
        .boolean()
        .optional()
        .describe('Whether to overwrite existing tags on contacts'),
      overwriteLists: z
        .boolean()
        .optional()
        .describe('Whether to overwrite existing list memberships')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of contacts processed'),
      inserted: z.number().describe('Number of new contacts inserted'),
      updated: z.number().describe('Number of existing contacts updated'),
      deleted: z.number().describe('Number of contacts deleted'),
      newEmails: z.number().describe('Number of new email addresses added'),
      invalid: z.number().describe('Number of invalid entries'),
      log: z.any().optional().describe('Detailed log of import operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let result = await client.importContacts({
      field_names: ctx.input.fieldNames,
      data: ctx.input.data,
      double_optin: ctx.input.doubleOptin ? Number(ctx.input.doubleOptin) : undefined,
      overwrite_tags: ctx.input.overwriteTags ? 1 : 0,
      overwrite_lists: ctx.input.overwriteLists ? 1 : 0
    });

    return {
      output: {
        total: result.total,
        inserted: result.inserted,
        updated: result.updated,
        deleted: result.deleted,
        newEmails: result.new_emails,
        invalid: result.invalid,
        log: result.log
      },
      message: `Imported **${result.total}** contacts: ${result.inserted} inserted, ${result.updated} updated, ${result.invalid} invalid`
    };
  })
  .build();
