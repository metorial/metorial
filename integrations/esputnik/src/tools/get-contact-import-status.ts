import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactImportStatus = SlateTool.create(spec, {
  name: 'Get Contact Import Status',
  key: 'get_contact_import_status',
  description:
    'Check a bulk contact import using its asyncSessionId and retrieve the IDs of contacts created or updated.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      asyncSessionId: z.string().min(1).describe('Session ID returned by bulk_upsert_contacts')
    })
  )
  .output(
    z.object({
      asyncSessionId: z.string().describe('The requested import session'),
      status: z.string().optional().describe('STARTED, IMPORTING, FINISHED, or ERROR'),
      timestamp: z.string().optional().describe('Time the status was set, in ISO 8601 format'),
      description: z.string().optional().describe('Additional import status or error details'),
      mapping: z
        .array(
          z.object({
            dedupeValue: z
              .string()
              .optional()
              .describe('Value used to deduplicate the contact'),
            contactId: z.number().optional().describe('Created or updated contact ID')
          })
        )
        .optional()
        .describe('Mappings for contacts processed by the import')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getContactImportStatus(
      ctx.input.asyncSessionId
    );
    return {
      output: {
        asyncSessionId: ctx.input.asyncSessionId,
        status: result.status,
        timestamp: result.timestamp,
        description: result.description,
        mapping: result.mapping
      },
      message: `Contact import **${ctx.input.asyncSessionId}**: ${result.status || 'status unavailable'}.`
    };
  })
  .build();
