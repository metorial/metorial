import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageChangeRequest = SlateTool.create(spec, {
  name: 'Manage Change Request',
  key: 'manage_change_request',
  description: `Create or update a change request in ServiceNow. Handles scheduling, risk assessment, approval, implementation details, and state transitions. If a change request ID is provided, it is updated; otherwise a new one is created.`,
  instructions: [
    'State values: -5=New, -4=Assess, -3=Authorize, -2=Scheduled, -1=Implement, 0=Review, 3=Closed, 4=Canceled.',
    'Type values: normal, standard, emergency.',
    'Risk values: 1=Very High, 2=High, 3=Moderate, 4=Low.'
  ]
})
  .input(
    z.object({
      changeRequestId: z
        .string()
        .optional()
        .describe(
          'sys_id of an existing change request to update. If omitted, a new one is created.'
        ),
      shortDescription: z.string().optional().describe('Brief summary of the change'),
      description: z.string().optional().describe('Detailed description of the change'),
      type: z
        .enum(['normal', 'standard', 'emergency'])
        .optional()
        .describe('Type of change request'),
      state: z
        .string()
        .optional()
        .describe(
          'State of the change request (e.g. "-5" for New, "-1" for Implement, "3" for Closed)'
        ),
      risk: z
        .enum(['1', '2', '3', '4'])
        .optional()
        .describe('Risk level: 1=Very High, 2=High, 3=Moderate, 4=Low'),
      impact: z.enum(['1', '2', '3']).optional().describe('Impact: 1=High, 2=Medium, 3=Low'),
      priority: z
        .enum(['1', '2', '3', '4'])
        .optional()
        .describe('Priority: 1=Critical, 2=High, 3=Moderate, 4=Low'),
      assignedTo: z.string().optional().describe('sys_id of the assignee'),
      assignmentGroup: z.string().optional().describe('sys_id of the assignment group'),
      startDate: z
        .string()
        .optional()
        .describe('Planned start date (YYYY-MM-DD HH:mm:ss format)'),
      endDate: z.string().optional().describe('Planned end date (YYYY-MM-DD HH:mm:ss format)'),
      justification: z.string().optional().describe('Business justification for the change'),
      implementationPlan: z.string().optional().describe('Steps to implement the change'),
      backoutPlan: z.string().optional().describe('Steps to back out the change if needed'),
      testPlan: z.string().optional().describe('Steps to test the change'),
      workNotes: z.string().optional().describe('Internal work note to add'),
      closeCode: z
        .string()
        .optional()
        .describe('Close code (e.g. "successful", "unsuccessful")'),
      closeNotes: z.string().optional().describe('Closing notes')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The created or updated change request record'),
      changeRequestId: z.string().describe('The sys_id of the change request'),
      changeRequestNumber: z
        .string()
        .optional()
        .describe('The change request number (e.g. CHG0010001)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let fields: Record<string, any> = {};
    if (ctx.input.shortDescription) fields.short_description = ctx.input.shortDescription;
    if (ctx.input.description) fields.description = ctx.input.description;
    if (ctx.input.type) fields.type = ctx.input.type;
    if (ctx.input.state) fields.state = ctx.input.state;
    if (ctx.input.risk) fields.risk = ctx.input.risk;
    if (ctx.input.impact) fields.impact = ctx.input.impact;
    if (ctx.input.priority) fields.priority = ctx.input.priority;
    if (ctx.input.assignedTo) fields.assigned_to = ctx.input.assignedTo;
    if (ctx.input.assignmentGroup) fields.assignment_group = ctx.input.assignmentGroup;
    if (ctx.input.startDate) fields.start_date = ctx.input.startDate;
    if (ctx.input.endDate) fields.end_date = ctx.input.endDate;
    if (ctx.input.justification) fields.justification = ctx.input.justification;
    if (ctx.input.implementationPlan)
      fields.implementation_plan = ctx.input.implementationPlan;
    if (ctx.input.backoutPlan) fields.backout_plan = ctx.input.backoutPlan;
    if (ctx.input.testPlan) fields.test_plan = ctx.input.testPlan;
    if (ctx.input.workNotes) fields.work_notes = ctx.input.workNotes;
    if (ctx.input.closeCode) fields.close_code = ctx.input.closeCode;
    if (ctx.input.closeNotes) fields.close_notes = ctx.input.closeNotes;

    let record: any;
    let action: string;

    if (ctx.input.changeRequestId) {
      record = await client.updateRecord('change_request', ctx.input.changeRequestId, fields, {
        displayValue: 'all'
      });
      action = 'Updated';
    } else {
      record = await client.createRecord('change_request', fields, { displayValue: 'all' });
      action = 'Created';
    }

    return {
      output: {
        record,
        changeRequestId: record.sys_id,
        changeRequestNumber: record.number?.display_value || record.number
      },
      message: `${action} change request **${record.number?.display_value || record.number || record.sys_id}**: ${record.short_description?.display_value || record.short_description || 'No description'}`
    };
  })
  .build();
