import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateOutputSchema = z.object({
  templateId: z.number().describe('Email template ID'),
  title: z.string().nullable().optional().describe('Template title'),
  subject: z.string().nullable().optional().describe('Template subject line'),
  body: z.string().nullable().optional().describe('Template body content'),
  openCount: z.number().nullable().optional().describe('Number of opens'),
  clickCount: z.number().nullable().optional().describe('Number of clicks'),
  replyCount: z.number().nullable().optional().describe('Number of replies'),
  sentCount: z.number().nullable().optional().describe('Number of times sent'),
  bounceCount: z.number().nullable().optional().describe('Number of bounces'),
  shared: z.boolean().nullable().optional().describe('Whether template is shared'),
  teamTemplate: z.boolean().nullable().optional().describe('Whether this is a team template'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  ownerId: z.number().nullable().optional().describe('Owner user ID')
});

let mapTemplate = (raw: any) => ({
  templateId: raw.id,
  title: raw.title,
  subject: raw.subject,
  body: raw.body,
  openCount: raw.open_count ?? raw.counts?.opens,
  clickCount: raw.click_count ?? raw.counts?.clicks,
  replyCount: raw.reply_count ?? raw.counts?.replies,
  sentCount: raw.sent_count ?? raw.counts?.sent_emails,
  bounceCount: raw.bounce_count ?? raw.counts?.bounces,
  shared: raw.shared,
  teamTemplate: raw.team_template,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  ownerId: raw.owner?.id ?? null
});

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

export let listEmailTemplates = SlateTool.create(spec, {
  name: 'List Email Templates',
  key: 'list_email_templates',
  description: `List email templates in SalesLoft. Search by title or subject to find specific templates. Returns template content and engagement statistics (opens, clicks, replies).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      searchTitle: z
        .string()
        .optional()
        .describe('Search templates by title (starts with, min 3 chars)'),
      searchSubject: z
        .string()
        .optional()
        .describe('Search templates by subject (starts with, min 3 chars)')
    })
  )
  .output(
    z.object({
      templates: z.array(templateOutputSchema).describe('List of email templates'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEmailTemplates(ctx.input);
    let templates = result.data.map(mapTemplate);

    return {
      output: {
        templates,
        paging: result.metadata.paging
      },
      message: `Found **${templates.length}** email templates (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

export let getEmailTemplate = SlateTool.create(spec, {
  name: 'Get Email Template',
  key: 'get_email_template',
  description: `Fetch a single email template from SalesLoft by ID. Returns template content, subject, and engagement statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the email template to fetch')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let template = await client.getEmailTemplate(ctx.input.templateId);
    let output = mapTemplate(template);

    return {
      output,
      message: `Fetched email template **${output.title}** (ID: ${output.templateId}).`
    };
  })
  .build();
