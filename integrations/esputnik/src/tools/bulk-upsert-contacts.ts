import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  type: z
    .enum(['email', 'sms', 'viber', 'mobilepush', 'webpush', 'appinbox', 'widget', 'inapp'])
    .describe('Channel type'),
  value: z.string().describe('Channel identifier')
});

let contactSchema = z.object({
  channels: z.array(channelSchema).min(1).describe('At least one channel required'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  externalCustomerId: z.string().optional().describe('External customer ID'),
  fields: z
    .array(
      z.object({
        id: z.number().describe('Custom field ID'),
        value: z.string().describe('Custom field value')
      })
    )
    .optional()
    .describe('Custom fields')
});

export let bulkUpsertContacts = SlateTool.create(spec, {
  name: 'Bulk Upsert Contacts',
  key: 'bulk_upsert_contacts',
  description: `Add or update multiple contacts at once. Supports deduplication, segment assignment, and custom fields.
Use this for importing batches of contacts efficiently.`,
  constraints: ['Maximum 3,000 contacts per request'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z.array(contactSchema).min(1).max(3000).describe('Contacts to add or update'),
      dedupeOn: z
        .enum(['email', 'sms', 'push', 'email_or_sms', 'id', 'externalCustomerId', 'fieldId'])
        .describe('Deduplication strategy'),
      fieldId: z
        .number()
        .optional()
        .describe('Custom field ID to use for deduplication (when dedupeOn is "fieldId")'),
      groupNames: z.array(z.string()).optional().describe('Segment names to add contacts to'),
      groupNamesExclude: z
        .array(z.string())
        .optional()
        .describe('Segment names to remove contacts from'),
      restoreDeleted: z
        .boolean()
        .optional()
        .describe('Restore previously deleted contacts if matched'),
      eventKeyForNewContacts: z
        .string()
        .optional()
        .describe('Event key to generate for newly created contacts')
    })
  )
  .output(
    z.object({
      asyncSessionId: z
        .string()
        .optional()
        .describe('Async import session ID for tracking progress'),
      failedContacts: z.array(z.any()).optional().describe('Contacts that failed to import'),
      errorMessage: z.string().optional().describe('Error message if import partially failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, any> = {
      contacts: ctx.input.contacts,
      dedupeOn: ctx.input.dedupeOn
    };

    if (ctx.input.fieldId !== undefined) payload.fieldId = ctx.input.fieldId;
    if (ctx.input.groupNames) payload.groupNames = ctx.input.groupNames;
    if (ctx.input.groupNamesExclude) payload.groupNamesExclude = ctx.input.groupNamesExclude;
    if (ctx.input.restoreDeleted !== undefined)
      payload.restoreDeleted = ctx.input.restoreDeleted;
    if (ctx.input.eventKeyForNewContacts)
      payload.eventKeyForNewContacts = ctx.input.eventKeyForNewContacts;

    let result = await client.bulkAddOrUpdateContacts(payload);

    let failedCount = result.failedContacts?.length || 0;
    let sessionId = result.asyncSessionId || '';

    return {
      output: {
        asyncSessionId: result.asyncSessionId,
        failedContacts: result.failedContacts,
        errorMessage: result.errorMessage
      },
      message: `Bulk import started (session: **${sessionId}**). ${failedCount > 0 ? `**${failedCount}** contact(s) failed.` : 'All contacts accepted.'}`
    };
  })
  .build();
