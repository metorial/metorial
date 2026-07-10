import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createDynamicsClient,
  dataverseAlternateKeySchema,
  dataverseRecordSchema,
  inferDataverseRecordId,
  recordKeyFromInput
} from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by GUID or alternate key from any Dynamics 365 Dataverse table. Supports selecting specific columns and expanding related records via navigation properties.`,
  instructions: [
    'Use $select to limit returned columns and improve performance.',
    'Use $expand to include related entity data in the response (e.g., "primarycontactid" or "contact_customer_accounts").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe('OData entity set name (e.g., "accounts", "contacts", "leads")'),
      recordId: z.string().optional().describe('GUID of the record to retrieve'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values to identify the record when recordId is omitted'),
      select: z.array(z.string()).optional().describe('List of column names to return'),
      expand: z
        .string()
        .optional()
        .describe(
          'Navigation property to expand (e.g., "primarycontactid($select=fullname)")'
        ),
      includeAnnotations: z
        .boolean()
        .optional()
        .describe(
          'When true, includes OData annotations such as formatted values and lookup logical names'
        )
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('OData entity set name used for the read'),
      recordId: z.string().optional().describe('Best-effort GUID for the retrieved record'),
      record: dataverseRecordSchema.describe('The retrieved record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let recordKey = recordKeyFromInput({
      recordId: ctx.input.recordId,
      alternateKey: ctx.input.alternateKey
    });

    let record = await client.getRecord(ctx.input.entitySetName, recordKey, {
      select: ctx.input.select,
      expand: ctx.input.expand,
      includeAnnotations: ctx.input.includeAnnotations
    });

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: inferDataverseRecordId(record, ctx.input.recordId),
        record
      },
      message: `Retrieved record from **${ctx.input.entitySetName}**.`
    };
  })
  .build();
