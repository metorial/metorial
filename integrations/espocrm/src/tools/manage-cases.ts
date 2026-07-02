import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageCases = SlateTool.create(spec, {
  name: 'Manage Cases',
  key: 'manage_cases',
  description: `Create, update, or delete Case (support ticket) records in EspoCRM. Cases track customer support issues and can be linked to contacts and accounts.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      caseId: z.string().optional().describe('Case ID (required for update and delete)'),
      name: z.string().optional().describe('Case subject/title'),
      status: z
        .string()
        .optional()
        .describe('Case status (e.g., New, Assigned, Pending, Closed)'),
      priority: z
        .string()
        .optional()
        .describe('Priority level (e.g., Low, Normal, High, Urgent)'),
      type: z.string().optional().describe('Case type'),
      description: z.string().optional().describe('Case description'),
      accountId: z.string().optional().describe('ID of the associated Account'),
      contactId: z.string().optional().describe('ID of the associated Contact'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      caseId: z.string().describe('ID of the case'),
      name: z.string().optional().describe('Case subject/title'),
      status: z.string().optional().describe('Case status'),
      priority: z.string().optional().describe('Priority level'),
      type: z.string().optional().describe('Case type'),
      accountId: z.string().optional().describe('Associated Account ID'),
      accountName: z.string().optional().describe('Associated Account name'),
      contactId: z.string().optional().describe('Associated Contact ID'),
      contactName: z.string().optional().describe('Associated Contact name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, caseId, customFields, ...fields } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Case', data);
      return {
        output: {
          caseId: result.id,
          name: result.name,
          status: result.status,
          priority: result.priority,
          type: result.type,
          accountId: result.accountId,
          accountName: result.accountName,
          contactId: result.contactId,
          contactName: result.contactName,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Case **${result.name || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!caseId) throw new Error('caseId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Case', caseId, data);
      return {
        output: {
          caseId: result.id,
          name: result.name,
          status: result.status,
          priority: result.priority,
          type: result.type,
          accountId: result.accountId,
          accountName: result.accountName,
          contactId: result.contactId,
          contactName: result.contactName,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Case **${result.name || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!caseId) throw new Error('caseId is required for delete');
      await client.deleteRecord('Case', caseId);
      return {
        output: {
          caseId
        },
        message: `Case **${caseId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
