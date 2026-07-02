import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createDynamicsClient,
  dataverseRecordSchema,
  inferDataverseRecordId
} from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in any Dynamics 365 Dataverse table (for example, accounts, contacts, leads, opportunities, cases, or custom tables).
Supports duplicate detection when enabled. Use **@odata.bind** annotations in the record data to associate new records with existing ones during creation.`,
  instructions: [
    'The entitySetName must be the OData entity set name (plural form), e.g., "accounts", "contacts", "leads", "opportunities", "incidents" (for cases).',
    'Use @odata.bind in recordData to link to existing records, e.g., { "parentcustomerid_account@odata.bind": "/accounts(guid)" }.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe(
          'OData entity set name (e.g., "accounts", "contacts", "leads", "opportunities", "incidents")'
        ),
      recordData: z
        .record(z.string(), z.any())
        .describe('Record field values to set on the new record'),
      detectDuplicates: z
        .boolean()
        .optional()
        .describe('Enable duplicate detection using existing rules'),
      returnRepresentation: z
        .boolean()
        .optional()
        .describe(
          'When false, Dataverse may return an empty record body instead of the created row'
        )
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('OData entity set name used for the create'),
      recordId: z
        .string()
        .optional()
        .describe('Best-effort GUID extracted from the returned record'),
      record: dataverseRecordSchema.describe('The created record with all returned fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let record = await client.createRecord(ctx.input.entitySetName, ctx.input.recordData, {
      detectDuplicates: ctx.input.detectDuplicates,
      returnRepresentation: ctx.input.returnRepresentation
    });

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: inferDataverseRecordId(record),
        record
      },
      message: `Created a new record in **${ctx.input.entitySetName}**.`
    };
  })
  .build();
