import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRecord = SlateTool.create(spec, {
  name: 'Manage Record',
  key: 'manage_record',
  description:
    'Create, update, or delete an EspoCRM record of any supported entity type, including custom entities and entities without a dedicated management tool.',
  instructions: [
    'Entity types and field names depend on your instance. Find them in Administration > Entity Manager.',
    'Use list_records or get_record to discover IDs and existing field values before updating or deleting.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      entityType: z
        .string()
        .min(1)
        .describe(
          'Entity type, such as Document, KnowledgeBaseArticle, or a custom entity name'
        ),
      recordId: z.string().optional().describe('Record ID; required for update and delete'),
      fields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Record attributes; required for create and update. Use provider field names and values, including null to clear nullable fields.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      recordId: z.string().describe('ID of the created, updated, or deleted record'),
      record: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider-returned attributes for create or update')
    })
  )
  .handleInvocation(async ctx => {
    let { action, entityType, recordId, fields } = ctx.input;
    if (action !== 'create' && !recordId) {
      throw createApiServiceError(
        'recordId is required for update and delete. Use list_records to find a record.'
      );
    }
    if (action !== 'delete' && !fields) {
      throw createApiServiceError(
        'fields is required for create and update. Provide the record attributes to save.'
      );
    }
    let client = createClient(ctx);
    if (action === 'delete') {
      await client.deleteRecord(entityType, recordId!);
      return {
        output: { success: true, recordId: recordId! },
        message: `Deleted ${entityType} record **${recordId}**.`
      };
    }
    let record =
      action === 'create'
        ? await client.createRecord(entityType, fields!)
        : await client.updateRecord(entityType, recordId!, fields!);
    return {
      output: { success: true, recordId: record.id, record },
      message: `${action === 'create' ? 'Created' : 'Updated'} ${entityType} record **${record.name || record.id}**.`
    };
  })
  .build();
