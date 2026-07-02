import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageNotes = SlateTool.create(spec, {
  name: 'Manage Notes',
  key: 'manage_notes',
  description: `Create, update, or delete notes attached to deals, persons, organizations, or leads in Pipedrive.
Notes support HTML content and can be pinned to the top of the entity's detail view.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      noteId: z.number().optional().describe('Note ID (required for update and delete)'),
      content: z
        .string()
        .optional()
        .describe('Note content (HTML supported, required for create)'),
      dealId: z.number().optional().describe('Deal ID to attach note to'),
      personId: z.number().optional().describe('Person ID to attach note to'),
      organizationId: z.number().optional().describe('Organization ID to attach note to'),
      leadId: z.string().optional().describe('Lead ID to attach note to'),
      pinnedToDealFlag: z.boolean().optional().describe('Pin note to the deal'),
      pinnedToPersonFlag: z.boolean().optional().describe('Pin note to the person'),
      pinnedToOrganizationFlag: z
        .boolean()
        .optional()
        .describe('Pin note to the organization'),
      pinnedToLeadFlag: z.boolean().optional().describe('Pin note to the lead')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('Note ID'),
      content: z.string().optional().describe('Note content'),
      dealId: z.number().optional().nullable().describe('Attached deal ID'),
      personId: z.number().optional().nullable().describe('Attached person ID'),
      organizationId: z.number().optional().nullable().describe('Attached organization ID'),
      leadId: z.string().optional().nullable().describe('Attached lead ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the note was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.noteId)
        throw pipedriveServiceError('noteId is required for delete action');
      await client.deleteNote(ctx.input.noteId);
      return {
        output: { noteId: ctx.input.noteId, deleted: true },
        message: `Note **#${ctx.input.noteId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.content) body.content = ctx.input.content;
    if (ctx.input.dealId) body.deal_id = ctx.input.dealId;
    if (ctx.input.personId) body.person_id = ctx.input.personId;
    if (ctx.input.organizationId) body.org_id = ctx.input.organizationId;
    if (ctx.input.leadId) body.lead_id = ctx.input.leadId;
    if (ctx.input.pinnedToDealFlag !== undefined)
      body.pinned_to_deal_flag = ctx.input.pinnedToDealFlag ? 1 : 0;
    if (ctx.input.pinnedToPersonFlag !== undefined)
      body.pinned_to_person_flag = ctx.input.pinnedToPersonFlag ? 1 : 0;
    if (ctx.input.pinnedToOrganizationFlag !== undefined)
      body.pinned_to_organization_flag = ctx.input.pinnedToOrganizationFlag ? 1 : 0;
    if (ctx.input.pinnedToLeadFlag !== undefined)
      body.pinned_to_lead_flag = ctx.input.pinnedToLeadFlag ? 1 : 0;

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createNote(body);
    } else {
      if (!ctx.input.noteId)
        throw pipedriveServiceError('noteId is required for update action');
      result = await client.updateNote(ctx.input.noteId, body);
    }

    let note = result?.data;
    let action = ctx.input.action === 'create' ? 'created' : 'updated';

    return {
      output: {
        noteId: note?.id,
        content: note?.content,
        dealId: note?.deal_id,
        personId: note?.person_id,
        organizationId: note?.org_id,
        leadId: note?.lead_id,
        addTime: note?.add_time,
        updateTime: note?.update_time
      },
      message: `Note (ID: ${note?.id}) has been ${action}.`
    };
  });
