import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let displayFieldValue = (value: any) => {
  if (value && typeof value === 'object') {
    if ('value' in value) return value.value;
    if ('display_value' in value) return value.display_value;
  }

  return value;
};

export let manageIncident = SlateTool.create(spec, {
  name: 'Manage Incident',
  key: 'manage_incident',
  description: `Create or update an incident in ServiceNow with ITSM-specific fields. Handles priority, state, assignment, escalation, work notes, and resolution details. If an incident ID is provided, the incident is updated; otherwise a new incident is created.`,
  instructions: [
    'State values: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed.',
    'Impact values: 1=High, 2=Medium, 3=Low.',
    'Urgency values: 1=High, 2=Medium, 3=Low.',
    'Priority is auto-calculated from impact and urgency but can be overridden.'
  ]
})
  .input(
    z.object({
      incidentId: z
        .string()
        .optional()
        .describe(
          'sys_id of an existing incident to update. If omitted, a new incident is created.'
        ),
      shortDescription: z.string().optional().describe('Brief summary of the incident'),
      description: z.string().optional().describe('Detailed description of the incident'),
      state: z
        .enum(['1', '2', '3', '6', '7'])
        .optional()
        .describe('Incident state: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed'),
      impact: z.enum(['1', '2', '3']).optional().describe('Impact: 1=High, 2=Medium, 3=Low'),
      urgency: z.enum(['1', '2', '3']).optional().describe('Urgency: 1=High, 2=Medium, 3=Low'),
      priority: z
        .enum(['1', '2', '3', '4', '5'])
        .optional()
        .describe('Priority override: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning'),
      assignedTo: z
        .string()
        .optional()
        .describe('sys_id of the user to assign the incident to'),
      assignmentGroup: z
        .string()
        .optional()
        .describe('sys_id of the group to assign the incident to'),
      category: z.string().optional().describe('Incident category'),
      subcategory: z.string().optional().describe('Incident subcategory'),
      contactType: z
        .string()
        .optional()
        .describe('How the incident was reported (e.g. "phone", "email", "self-service")'),
      workNotes: z.string().optional().describe('Internal work note to add'),
      comments: z.string().optional().describe('Customer-visible comment to add'),
      closeCode: z
        .string()
        .optional()
        .describe(
          'Close code when resolving (e.g. "Solved (Permanently)", "Solved (Workaround/Temporary)")'
        ),
      closeNotes: z.string().optional().describe('Resolution notes when resolving or closing'),
      caller: z
        .string()
        .optional()
        .describe('sys_id of the caller (who reported the incident)')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The created or updated incident record'),
      incidentId: z.string().describe('The sys_id of the incident'),
      incidentNumber: z.string().optional().describe('The incident number (e.g. INC0010001)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let fields: Record<string, any> = {};
    if (ctx.input.shortDescription) fields.short_description = ctx.input.shortDescription;
    if (ctx.input.description) fields.description = ctx.input.description;
    if (ctx.input.state) fields.state = ctx.input.state;
    if (ctx.input.impact) fields.impact = ctx.input.impact;
    if (ctx.input.urgency) fields.urgency = ctx.input.urgency;
    if (ctx.input.priority) fields.priority = ctx.input.priority;
    if (ctx.input.assignedTo) fields.assigned_to = ctx.input.assignedTo;
    if (ctx.input.assignmentGroup) fields.assignment_group = ctx.input.assignmentGroup;
    if (ctx.input.category) fields.category = ctx.input.category;
    if (ctx.input.subcategory) fields.subcategory = ctx.input.subcategory;
    if (ctx.input.contactType) fields.contact_type = ctx.input.contactType;
    if (ctx.input.workNotes) fields.work_notes = ctx.input.workNotes;
    if (ctx.input.comments) fields.comments = ctx.input.comments;
    if (ctx.input.closeCode) fields.close_code = ctx.input.closeCode;
    if (ctx.input.closeNotes) fields.close_notes = ctx.input.closeNotes;
    if (ctx.input.caller) fields.caller_id = ctx.input.caller;

    let record: any;
    let action: string;

    if (ctx.input.incidentId) {
      record = await client.updateRecord('incident', ctx.input.incidentId, fields, {
        displayValue: 'all'
      });
      action = 'Updated';
    } else {
      record = await client.createRecord('incident', fields, { displayValue: 'all' });
      action = 'Created';
    }

    let incidentId = displayFieldValue(record.sys_id);
    let incidentNumber = displayFieldValue(record.number);
    let shortDescription = displayFieldValue(record.short_description);

    return {
      output: {
        record,
        incidentId,
        incidentNumber
      },
      message: `${action} incident **${incidentNumber || incidentId}**: ${shortDescription || 'No description'}`
    };
  })
  .build();
