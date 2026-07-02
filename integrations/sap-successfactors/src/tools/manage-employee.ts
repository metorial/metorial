import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEmployee = SlateTool.create(spec, {
  name: 'Manage Employee',
  key: 'manage_employee',
  description: `Create or update employee records in SAP SuccessFactors. Supports creating new employee records and updating existing ones across multiple entity sets including personal info, employment, job info, and compensation. For updates, provide only the fields that need to change.`,
  instructions: [
    'For creating employees, provide the entitySet as "User" and include required fields',
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
        .describe('The created or updated record (returned for create operations)'),
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    if (ctx.input.operation === 'create') {
      let record = await client.createEntity(ctx.input.entitySet, ctx.input.fields);
      return {
        output: { record, success: true },
        message: `Created new **${ctx.input.entitySet}** record`
      };
    } else {
      let keys = ctx.input.keys;
      if (!keys || Object.keys(keys).length === 0) {
        throw new Error('Keys are required for update operations');
      }

      if (Object.keys(keys).length === 1) {
        let [key] = Object.values(keys);
        await client.updateEntity(ctx.input.entitySet, String(key), ctx.input.fields);
      } else {
        await client.updateEntityByCompoundKey(
          ctx.input.entitySet,
          keys as Record<string, string | number>,
          ctx.input.fields
        );
      }

      return {
        output: { success: true },
        message: `Updated **${ctx.input.entitySet}** record`
      };
    }
  })
  .build();
