import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMailboxes = SlateTool.create(spec, {
  name: 'List Mailboxes',
  key: 'list_mailboxes',
  description: `List all mailboxes (parsers) in your Parseur account. Each mailbox is configured to process a specific type of document. Returns mailbox names, document counts, status breakdowns, and configuration details. Supports pagination, search, and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page (default 25)'),
      search: z
        .string()
        .optional()
        .describe('Case-insensitive partial match search on mailbox name'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort field. Prefix with - for descending. Options: name, document_count, template_count, PARSEDOK_count'
        )
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of results on current page'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      mailboxes: z.array(
        z.object({
          mailboxId: z.number().describe('Mailbox ID'),
          name: z.string().describe('Mailbox name'),
          emailPrefix: z
            .string()
            .describe('Email prefix for sending documents to this mailbox'),
          aiEngine: z.string().describe('AI engine used (e.g. GCP_AI_1, GCP_AI_2)'),
          documentCount: z.number().describe('Total number of documents'),
          templateCount: z.number().describe('Number of templates'),
          webhookCount: z.number().describe('Number of webhooks'),
          lastActivity: z.string().nullable().describe('Last activity timestamp (ISO 8601)'),
          documentsByStatus: z
            .record(z.string(), z.number())
            .describe('Document count by status')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMailboxes({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      search: ctx.input.search,
      ordering: ctx.input.ordering
    });

    let mailboxes = result.results.map(m => ({
      mailboxId: m.id,
      name: m.name,
      emailPrefix: m.email_prefix,
      aiEngine: m.ai_engine,
      documentCount: m.document_count,
      templateCount: m.template_count,
      webhookCount: m.webhook_count,
      lastActivity: m.last_activity,
      documentsByStatus: m.document_per_status_count
    }));

    return {
      output: {
        count: result.count,
        currentPage: result.current,
        totalPages: result.total,
        mailboxes
      },
      message: `Found **${result.count}** mailbox(es) on page ${result.current} of ${result.total}.`
    };
  })
  .build();
