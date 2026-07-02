import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let assigneeSchema = z
  .object({
    assigneeId: z.string().optional().describe('ID of the assignee'),
    name: z.string().optional().describe('Name of the assignee'),
    email: z.string().optional().describe('Email of the assignee')
  })
  .optional();

let questionnaireConnectionSchema = z
  .object({
    connectionId: z.string().describe('ID of the connection'),
    domain: z.string().describe('Domain of the connection'),
    crmLink: z.string().nullable().optional().describe('CRM link'),
    crmId: z.string().nullable().optional().describe('CRM ID')
  })
  .optional();

let questionnaireSchema = z.object({
  questionnaireId: z.string().describe('Unique ID of the questionnaire'),
  name: z.string().nullable().optional().describe('Questionnaire name'),
  status: z
    .string()
    .describe('Status: processing, started, ready_for_review, approved, or completed'),
  assignee: assigneeSchema.describe('Assigned user'),
  connection: questionnaireConnectionSchema.describe('Associated connection'),
  questionCount: z.number().optional().describe('Number of questions'),
  originalFormat: z
    .string()
    .optional()
    .describe('Original format: spreadsheet, file, or portal'),
  crmLink: z.string().nullable().optional().describe('CRM link'),
  isTest: z.boolean().optional().describe('Whether this is a test questionnaire'),
  dueAt: z.string().nullable().optional().describe('Due date'),
  completedAt: z.string().nullable().optional().describe('Completion date'),
  createdAt: z.string().describe('When the questionnaire was created'),
  updatedAt: z.string().describe('When the questionnaire was last updated')
});

export let listQuestionnaires = SlateTool.create(spec, {
  name: 'List Questionnaires',
  key: 'list_questionnaires',
  description: `Retrieve questionnaires submitted to Conveyor for AI-powered answering. Filter by status, product lines, or date ranges. Useful for tracking questionnaire progress and turnaround times.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['processing', 'started', 'ready_for_review', 'approved', 'completed'])
        .optional()
        .describe('Filter by questionnaire status'),
      productLineIds: z.string().optional().describe('Comma-separated product line UUIDs'),
      createdAtStart: z.string().optional().describe('Created on or after (YYYY-MM-DD)'),
      createdAtEnd: z.string().optional().describe('Created on or before (YYYY-MM-DD)'),
      completedAtStart: z.string().optional().describe('Completed on or after (YYYY-MM-DD)'),
      completedAtEnd: z.string().optional().describe('Completed on or before (YYYY-MM-DD)'),
      dueAtStart: z.string().optional().describe('Due on or after (YYYY-MM-DD)'),
      dueAtEnd: z.string().optional().describe('Due on or before (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      questionnaires: z.array(questionnaireSchema).describe('List of questionnaires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listQuestionnaires({
      status: ctx.input.status,
      productLineIds: ctx.input.productLineIds,
      createdAtStart: ctx.input.createdAtStart,
      createdAtEnd: ctx.input.createdAtEnd,
      completedAtStart: ctx.input.completedAtStart,
      completedAtEnd: ctx.input.completedAtEnd,
      dueAtStart: ctx.input.dueAtStart,
      dueAtEnd: ctx.input.dueAtEnd
    });

    let questionnaires = (data?._embedded?.questionnaires || []).map((q: any) => ({
      questionnaireId: q.id,
      name: q.name,
      status: q.status,
      assignee: q.assignee
        ? {
            assigneeId: q.assignee.id,
            name: q.assignee.name,
            email: q.assignee.email
          }
        : undefined,
      connection: q.connection
        ? {
            connectionId: q.connection.id,
            domain: q.connection.domain,
            crmLink: q.connection.crm_link,
            crmId: q.connection.crm_id
          }
        : undefined,
      questionCount: q.question_count,
      originalFormat: q.original_format,
      crmLink: q.crm_link,
      isTest: q.is_test,
      dueAt: q.due_at,
      completedAt: q.completed_at,
      createdAt: q.created_at,
      updatedAt: q.updated_at
    }));

    return {
      output: { questionnaires },
      message: `Found **${questionnaires.length}** questionnaires${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();

export let submitQuestionnaire = SlateTool.create(spec, {
  name: 'Submit Questionnaire',
  key: 'submit_questionnaire',
  description: `Submit a new questionnaire to Conveyor for AI-powered answering. Provide the customer domain, submitter email, and format. For portal-based questionnaires, provide the portal URL. For file-based, a file upload is required separately.`,
  instructions: [
    'The domain should be the customer domain (e.g., "google.com"), not a URL.',
    'Original format: "spreadsheet" for Excel/CSV, "file" for Word/PDF, "portal" for web portal questionnaires.',
    'If no due date is provided, it defaults to three business days.'
  ]
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Customer domain that sent the questionnaire (e.g., "google.com")'),
      email: z.string().describe('Email of the person creating/submitting the questionnaire'),
      originalFormat: z
        .enum(['spreadsheet', 'file', 'portal'])
        .describe('Questionnaire format'),
      questionnaireType: z
        .enum(['security_questionnaire', 'rfp'])
        .optional()
        .describe('Type (default: security_questionnaire)'),
      dueAt: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      productLineIds: z.string().optional().describe('Comma-separated product line UUIDs'),
      portalUrl: z.string().optional().describe('URL for portal-based questionnaires'),
      notes: z.string().optional().describe('Access notes for portal-based questionnaires'),
      customerName: z.string().optional().describe('CRM record readable name'),
      crmId: z.string().optional().describe('Unique CRM record ID'),
      crmAmount: z.number().optional().describe('Monetary amount of CRM record')
    })
  )
  .output(
    z.object({
      questionnaireId: z.string().describe('ID of the created questionnaire'),
      dueAt: z.string().describe('Due date for the questionnaire'),
      createdAt: z.string().describe('When the questionnaire was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let result = await client.createQuestionnaire({
      domain: ctx.input.domain,
      email: ctx.input.email,
      originalFormat: ctx.input.originalFormat,
      questionnaireType: ctx.input.questionnaireType,
      dueAt: ctx.input.dueAt,
      productLineIds: ctx.input.productLineIds,
      portalUrl: ctx.input.portalUrl,
      notes: ctx.input.notes,
      customerName: ctx.input.customerName,
      crmId: ctx.input.crmId,
      crmAmount: ctx.input.crmAmount
    });

    return {
      output: {
        questionnaireId: result.id,
        dueAt: result.due_at,
        createdAt: result.created_at
      },
      message: `Questionnaire submitted for **${ctx.input.domain}** with ID \`${result.id}\`. Due at ${result.due_at}.`
    };
  })
  .build();
