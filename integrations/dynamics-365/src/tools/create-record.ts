import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in any Dynamics 365 entity (e.g., accounts, contacts, leads, opportunities, cases, or custom entities).
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
        .describe('Enable duplicate detection using existing rules')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The created record with all returned fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let record = await client.createRecord(
      ctx.input.entitySetName,
      ctx.input.recordData,
      ctx.input.detectDuplicates
    );

    return {
      output: { record },
      message: `Created a new record in **${ctx.input.entitySetName}**.`
    };
  })
  .build();
