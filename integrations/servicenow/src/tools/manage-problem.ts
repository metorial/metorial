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

export let manageProblem = SlateTool.create(spec, {
  name: 'Manage Problem',
  key: 'manage_problem',
  description: `Create or update a ServiceNow problem record with ITSM-specific fields. Use this for root-cause investigations, known errors, workarounds, assignment, priority, work notes, and closure details. If a problem ID is provided, the problem is updated; otherwise a new problem is created.`,
  instructions: [
    'Problem state values vary by ServiceNow instance; provide the numeric state value configured in the target instance.',
    'Impact values: 1=High, 2=Medium, 3=Low.',
    'Urgency values: 1=High, 2=Medium, 3=Low.',
    'Priority values commonly use 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning.'
  ]
})
  .input(
    z.object({
      problemId: z
        .string()
        .optional()
        .describe(
          'sys_id of an existing problem to update. If omitted, a new problem is created.'
        ),
      shortDescription: z.string().optional().describe('Brief summary of the problem'),
      description: z.string().optional().describe('Detailed problem description'),
      state: z
        .string()
        .optional()
        .describe('Problem state numeric value configured in the target ServiceNow instance'),
      impact: z.enum(['1', '2', '3']).optional().describe('Impact: 1=High, 2=Medium, 3=Low'),
      urgency: z.enum(['1', '2', '3']).optional().describe('Urgency: 1=High, 2=Medium, 3=Low'),
      priority: z
        .enum(['1', '2', '3', '4', '5'])
        .optional()
        .describe('Priority: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning'),
      assignedTo: z.string().optional().describe('sys_id of the assignee'),
      assignmentGroup: z.string().optional().describe('sys_id of the assignment group'),
      category: z.string().optional().describe('Problem category'),
      subcategory: z.string().optional().describe('Problem subcategory'),
      knownError: z.boolean().optional().describe('Whether this problem is a known error'),
      workaround: z.string().optional().describe('Known workaround or mitigation details'),
      causeNotes: z.string().optional().describe('Root-cause analysis notes'),
      fixNotes: z.string().optional().describe('Fix or resolution notes'),
      workNotes: z.string().optional().describe('Internal work note to add'),
      comments: z.string().optional().describe('Customer-visible comment to add'),
      closeCode: z.string().optional().describe('Problem close code'),
      closeNotes: z.string().optional().describe('Problem close notes')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The created or updated problem record'),
      problemId: z.string().describe('The sys_id of the problem'),
      problemNumber: z.string().optional().describe('The problem number, e.g. PRB0010001')
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
    if (ctx.input.knownError !== undefined)
      fields.known_error = ctx.input.knownError.toString();
    if (ctx.input.workaround) fields.workaround = ctx.input.workaround;
    if (ctx.input.causeNotes) fields.cause_notes = ctx.input.causeNotes;
    if (ctx.input.fixNotes) fields.fix_notes = ctx.input.fixNotes;
    if (ctx.input.workNotes) fields.work_notes = ctx.input.workNotes;
    if (ctx.input.comments) fields.comments = ctx.input.comments;
    if (ctx.input.closeCode) fields.close_code = ctx.input.closeCode;
    if (ctx.input.closeNotes) fields.close_notes = ctx.input.closeNotes;

    let record: any;
    let action: string;

    if (ctx.input.problemId) {
      record = await client.updateRecord('problem', ctx.input.problemId, fields, {
        displayValue: 'all'
      });
      action = 'Updated';
    } else {
      record = await client.createRecord('problem', fields, { displayValue: 'all' });
      action = 'Created';
    }

    let problemId = displayFieldValue(record.sys_id);
    let problemNumber = displayFieldValue(record.number);
    let shortDescription = displayFieldValue(record.short_description);

    return {
      output: {
        record,
        problemId,
        problemNumber
      },
      message: `${action} problem **${problemNumber || problemId}**: ${shortDescription || 'No description'}`
    };
  })
  .build();
