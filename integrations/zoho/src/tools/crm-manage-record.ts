import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoCrmClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let crmManageRecord = SlateTool.create(spec, {
  name: 'CRM Manage Record',
  key: 'crm_manage_record',
  description: `Create, update, or delete records in any Zoho CRM module (Leads, Contacts, Accounts, Deals, etc.). Supports creating single or multiple records, updating fields on existing records, and deleting records by ID.`,
  instructions: [
    'Set action to "create" to insert new records, "update" to modify existing, or "delete" to remove.',
    'For create, provide recordData as an array of objects with field API names as keys.',
    'For update, provide recordId and recordData with fields to change.',
    'For delete, provide recordId.',
    'Field names must be CRM API field names (e.g., "Last_Name", "Email", "Company").'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      module: z
        .string()
        .describe('CRM module API name (e.g., "Leads", "Contacts", "Accounts", "Deals")'),
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      recordId: z.string().optional().describe('Record ID (required for update and delete)'),
      recordData: z
        .union([z.array(z.record(z.string(), z.any())), z.record(z.string(), z.any())])
        .optional()
        .describe(
          'Record data: an object for update, or array of objects for create. Field API names as keys.'
        ),
      triggers: z
        .array(z.enum(['workflow', 'approval', 'blueprint']))
        .optional()
        .describe('Workflow triggers to execute on this operation')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional(),
            status: z.string(),
            message: z.string().optional(),
            code: z.string().optional()
          })
        )
        .describe('Result for each record in the operation')
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoCrmClient({ token: ctx.auth.token, datacenter: dc });

    if (ctx.input.action === 'create') {
      let records = Array.isArray(ctx.input.recordData)
        ? ctx.input.recordData
        : [ctx.input.recordData || {}];
      let result = await client.createRecords(ctx.input.module, records, ctx.input.triggers);
      let results = (result?.data || []).map((r: any) => ({
        recordId: r?.details?.id,
        status: r?.status || 'unknown',
        message: r?.message,
        code: r?.code
      }));
      return {
        output: { results },
        message: `Created **${results.filter((r: any) => r.status === 'success').length}** record(s) in **${ctx.input.module}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.recordId) throw zohoServiceError('recordId is required for update');
      let data = Array.isArray(ctx.input.recordData)
        ? ctx.input.recordData[0] || {}
        : ctx.input.recordData || {};
      let result = await client.updateRecord(
        ctx.input.module,
        ctx.input.recordId,
        data,
        ctx.input.triggers
      );
      let results = (result?.data || []).map((r: any) => ({
        recordId: r?.details?.id || ctx.input.recordId,
        status: r?.status || 'unknown',
        message: r?.message,
        code: r?.code
      }));
      return {
        output: { results },
        message: `Updated record **${ctx.input.recordId}** in **${ctx.input.module}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.recordId) throw zohoServiceError('recordId is required for delete');
      let result = await client.deleteRecord(ctx.input.module, ctx.input.recordId);
      let results = (result?.data || []).map((r: any) => ({
        recordId: r?.details?.id || ctx.input.recordId,
        status: r?.status || 'unknown',
        message: r?.message,
        code: r?.code
      }));
      return {
        output: { results },
        message: `Deleted record **${ctx.input.recordId}** from **${ctx.input.module}**.`
      };
    }

    throw zohoServiceError('Invalid CRM record action.');
  })
  .build();
