import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/helpers';
import { spec } from '../spec';

export let manageEmployee = SlateTool.create(spec, {
  name: 'Manage Employee',
  key: 'manage_employee',
  description: `Insert or merge scalar fields on an authorized OData entity. Tenant metadata determines keys, field types and supported operations. Updates first verify the exact existing record; no automatic upsert, nested navigation write or payroll workflow is performed.`,
  instructions: [
    'Call get_api_metadata before writing; provide every exact key and required writable field. Insert support varies by entity and permission',
    'For updating, specify the entitySet and compound keys that identify the record',
    'Use effective-dated entities by including startDate in the keys for historical tracking'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'update'])
        .describe('Whether to create a new record or update an existing one'),
      entitySet: z
        .string()
        .describe(
          'The OData entity set to operate on (e.g., "User", "EmpJob", "PerPersonal", "EmpCompensation")'
        ),
      keys: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .optional()
        .describe(
          'Compound key fields to identify the record for updates (e.g., { "userId": "user1", "seqNumber": 1, "startDate": "2024-01-01" })'
        ),
      fields: z.record(z.string(), z.unknown()).describe('Field values to set on the record')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Independently read back record after the write, with exact keys and requested fields'
        ),
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    if (ctx.input.operation === 'create') {
      if (ctx.input.keys !== undefined)
        throw invalid(
          'For create, supply key fields inside fields; keys is only for updates.'
        );
      let record = await client.createEntity(ctx.input.entitySet, ctx.input.fields);
      return {
        output: { record, success: true },
        message: `Created new **${ctx.input.entitySet}** record`
      };
    } else {
      let keys = ctx.input.keys;
      if (!keys || Object.keys(keys).length === 0) {
        throw invalid(
          'Keys are required for update operations. Call get_api_metadata to discover every key property.'
        );
      }

      let record = await client.updateEntityByCompoundKey(
        ctx.input.entitySet,
        keys,
        ctx.input.fields
      );

      return {
        output: { record, success: true },
        message: `Updated **${ctx.input.entitySet}** record`
      };
    }
  })
  .build();
