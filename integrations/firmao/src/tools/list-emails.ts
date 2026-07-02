import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listEmails = SlateTool.create(spec, {
  name: 'List Emails',
  key: 'list_emails',
  description: `Search and list emails stored in Firmao's mail system. Supports filtering by mailbox (INBOX, SENT, DRAFTS), subject, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      box: z.enum(['INBOX', 'SENT', 'DRAFTS']).optional().describe('Mailbox to filter by'),
      subjectContains: z
        .string()
        .optional()
        .describe('Filter emails whose subject contains this value')
    })
  )
  .output(
    z.object({
      emails: z.array(
        z.object({
          emailId: z.number(),
          subject: z.string().optional(),
          from: z.string().optional(),
          to: z.array(z.string()).optional(),
          status: z.string().optional(),
          box: z.string().optional(),
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          creationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.box) filters['box(eq)'] = ctx.input.box;
    if (ctx.input.subjectContains) filters['subject(contains)'] = ctx.input.subjectContains;

    let result = await client.list('mails', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let emails = result.data.map((e: any) => ({
      emailId: e.id,
      subject: e.subject,
      from: e.from,
      to: e.to,
      status: e.status,
      box: e.box,
      customerId: e.customer?.id,
      customerName: e.customer?.name,
      creationDate: e.creationDate
    }));

    return {
      output: { emails, totalSize: result.totalSize },
      message: `Found **${emails.length}** email(s) (total: ${result.totalSize}).`
    };
  })
  .build();
