import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all templates in a mailbox. Templates define how Parseur extracts data from documents. Each template is associated with an AI engine and tracks how many documents it has processed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.number().describe('ID of the mailbox to list templates from'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of results on current page'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      templates: z.array(
        z.object({
          templateId: z.number().describe('Template ID'),
          name: z.string().describe('Template name'),
          engine: z.string().describe('AI engine used'),
          status: z.string().describe('Template status'),
          documentCount: z.number().describe('Documents processed by this template'),
          mailboxId: z.number().describe('Mailbox this template belongs to')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTemplates(ctx.input.mailboxId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let templates = result.results.map(t => ({
      templateId: t.id,
      name: t.name,
      engine: t.engine,
      status: t.status,
      documentCount: t.document_count,
      mailboxId: t.parser
    }));

    return {
      output: {
        count: result.count,
        currentPage: result.current,
        totalPages: result.total,
        templates
      },
      message: `Found **${result.count}** template(s) in mailbox ${ctx.input.mailboxId}.`
    };
  })
  .build();
