import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRelationships = SlateTool.create(spec, {
  name: 'Manage Relationships',
  key: 'manage_relationships',
  description: `Link, unlink, or list related records in EspoCRM. Relationships connect entities like Contacts to Accounts, Opportunities to Contacts, etc. Use the link name that corresponds to the relationship (e.g., "contacts" on an Account, "opportunities" on a Contact).`,
  instructions: [
    'Common link names: contacts, accounts, opportunities, cases, meetings, calls, tasks, emails.',
    'Use "list" action to discover related records before linking/unlinking.'
  ]
})
  .input(
    z.object({
      action: z.enum(['link', 'unlink', 'list']).describe('Operation to perform'),
      entityType: z
        .string()
        .describe('Entity type of the parent record (e.g., Account, Contact, Lead)'),
      recordId: z.string().describe('ID of the parent record'),
      linkName: z
        .string()
        .describe('Relationship link name (e.g., contacts, opportunities, meetings)'),
      relatedRecordId: z
        .string()
        .optional()
        .describe('ID of the record to link or unlink (required for link/unlink)'),
      maxSize: z
        .number()
        .optional()
        .describe('Maximum number of related records to return (for list action, default 20)'),
      offset: z.number().optional().describe('Offset for pagination (for list action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      relatedRecords: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of related records (for list action)'),
      totalRelated: z
        .number()
        .optional()
        .describe('Total count of related records (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, entityType, recordId, linkName, relatedRecordId } = ctx.input;

    if (action === 'link') {
      if (!relatedRecordId) throw new Error('relatedRecordId is required for link action');
      await client.linkRecord(entityType, recordId, linkName, relatedRecordId);
      return {
        output: { success: true },
        message: `Linked record **${relatedRecordId}** to ${entityType} **${recordId}** via "${linkName}".`
      };
    }

    if (action === 'unlink') {
      if (!relatedRecordId) throw new Error('relatedRecordId is required for unlink action');
      await client.unlinkRecord(entityType, recordId, linkName, relatedRecordId);
      return {
        output: { success: true },
        message: `Unlinked record **${relatedRecordId}** from ${entityType} **${recordId}** via "${linkName}".`
      };
    }

    if (action === 'list') {
      let result = await client.getRelatedRecords(entityType, recordId, linkName, {
        maxSize: ctx.input.maxSize || 20,
        offset: ctx.input.offset
      });
      return {
        output: {
          success: true,
          relatedRecords: result.list,
          totalRelated: result.total
        },
        message: `Found **${result.total}** related "${linkName}" records for ${entityType} **${recordId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
