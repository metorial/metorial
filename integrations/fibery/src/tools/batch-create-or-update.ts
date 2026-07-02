import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchCreateOrUpdateTool = SlateTool.create(spec, {
  name: 'Batch Create or Update Entities',
  key: 'batch_create_or_update',
  description: `Create or update multiple entities at once with upsert semantics. Provide a conflict field to detect duplicates — matching entities are updated while new ones are created. Efficient for syncing external data into Fibery.`,
  instructions: [
    'The conflictField must be a text, integer, or date field used to detect existing entities.',
    'Set conflictAction to "update-latest" to update matching entities or "skip-create" to skip duplicates.',
    'Each entity in the array should contain the conflict field value and any other fields to set.'
  ],
  constraints: ['Rate limit: 3 requests per second per token.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      typeName: z
        .string()
        .describe('Fully qualified type name (e.g., "Project Management/Task")'),
      entities: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of entity objects with field values to create or update'),
      conflictField: z
        .string()
        .describe(
          'Fully qualified field name used for duplicate detection (e.g., "Project/ExternalId")'
        ),
      conflictAction: z
        .enum(['update-latest', 'skip-create'])
        .default('update-latest')
        .describe(
          'What to do when a duplicate is found: "update-latest" to update, "skip-create" to skip'
        )
    })
  )
  .output(
    z.object({
      processedCount: z.number().describe('Number of entities processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    await client.batchCreateOrUpdate({
      typeName: ctx.input.typeName,
      entities: ctx.input.entities,
      conflictField: ctx.input.conflictField,
      conflictAction: ctx.input.conflictAction
    });

    return {
      output: {
        processedCount: ctx.input.entities.length
      },
      message: `Batch processed **${ctx.input.entities.length}** entities of type **${ctx.input.typeName}** (conflict action: ${ctx.input.conflictAction}).`
    };
  })
  .build();
