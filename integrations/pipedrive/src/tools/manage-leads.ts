import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageLeads = SlateTool.create(spec, {
  name: 'Manage Leads',
  key: 'manage_leads',
  description: `Create, update, or delete leads in the Pipedrive Leads Inbox. Leads are prequalified potential deals that can later be converted to deals.
Supports setting title, labels, value, expected close date, linked person/organization, and visibility.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      leadId: z.string().optional().describe('Lead ID (required for update and delete)'),
      title: z.string().optional().describe('Lead title (required for create)'),
      personId: z.number().optional().describe('Person ID to link'),
      organizationId: z.number().optional().describe('Organization ID to link'),
      labelIds: z.array(z.string()).optional().describe('Array of label UUIDs to assign'),
      value: z
        .object({
          amount: z.number().describe('Monetary value'),
          currency: z.string().describe('Currency code')
        })
        .optional()
        .describe('Expected deal value'),
      expectedCloseDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      visibleTo: z
        .enum(['1', '3', '5', '7'])
        .optional()
        .describe('Visibility: 1=owner, 3=group, 5=group+sub, 7=company'),
      isArchived: z.boolean().optional().describe('Whether the lead is archived (update only)')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Lead ID'),
      title: z.string().optional().describe('Lead title'),
      personId: z.number().optional().nullable().describe('Linked person ID'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      isArchived: z.boolean().optional().describe('Whether the lead is archived'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the lead was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.leadId)
        throw pipedriveServiceError('leadId is required for delete action');
      await client.deleteLead(ctx.input.leadId);
      return {
        output: { leadId: ctx.input.leadId, deleted: true },
        message: `Lead **${ctx.input.leadId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.personId) body.person_id = ctx.input.personId;
    if (ctx.input.organizationId) body.organization_id = ctx.input.organizationId;
    if (ctx.input.labelIds) body.label_ids = ctx.input.labelIds;
    if (ctx.input.value) body.value = ctx.input.value;
    if (ctx.input.expectedCloseDate) body.expected_close_date = ctx.input.expectedCloseDate;
    if (ctx.input.visibleTo) body.visible_to = ctx.input.visibleTo;
    if (ctx.input.isArchived !== undefined) body.is_archived = ctx.input.isArchived;

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createLead(body);
    } else {
      if (!ctx.input.leadId)
        throw pipedriveServiceError('leadId is required for update action');
      result = await client.updateLead(ctx.input.leadId, body);
    }

    let lead = result?.data;
    let action = ctx.input.action === 'create' ? 'created' : 'updated';

    return {
      output: {
        leadId: lead?.id,
        title: lead?.title,
        personId: lead?.person_id,
        organizationId: lead?.organization_id,
        isArchived: lead?.is_archived,
        addTime: lead?.add_time,
        updateTime: lead?.update_time
      },
      message: `Lead **"${lead?.title}"** (ID: ${lead?.id}) has been ${action}.`
    };
  });
