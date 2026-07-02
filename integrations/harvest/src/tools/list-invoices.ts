import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve invoices with optional filtering by client, project, state, and date range. Returns invoice details including amounts, status, and dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.number().optional().describe('Filter by client ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      state: z
        .enum(['draft', 'open', 'paid', 'closed'])
        .optional()
        .describe('Filter by invoice state'),
      from: z.string().optional().describe('Start of date range (YYYY-MM-DD)'),
      to: z.string().optional().describe('End of date range (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max 2000)')
    })
  )
  .output(
    z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.number().describe('Invoice ID'),
          clientId: z.number().optional().describe('Client ID'),
          clientName: z.string().optional().describe('Client name'),
          number: z.string().nullable().describe('Invoice number'),
          amount: z.number().describe('Total amount'),
          dueAmount: z.number().describe('Amount due'),
          state: z.string().describe('Invoice state'),
          issueDate: z.string().nullable().describe('Issue date'),
          dueDate: z.string().nullable().describe('Due date'),
          subject: z.string().nullable().describe('Subject'),
          currency: z.string().describe('Currency code')
        })
      ),
      totalEntries: z.number().describe('Total invoices'),
      totalPages: z.number().describe('Total pages'),
      page: z.number().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listInvoices({
      clientId: ctx.input.clientId,
      projectId: ctx.input.projectId,
      state: ctx.input.state,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let invoices = result.results.map((inv: any) => ({
      invoiceId: inv.id,
      clientId: inv.client?.id,
      clientName: inv.client?.name,
      number: inv.number,
      amount: inv.amount,
      dueAmount: inv.due_amount,
      state: inv.state,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      subject: inv.subject,
      currency: inv.currency
    }));

    return {
      output: {
        invoices,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        page: result.page
      },
      message: `Found **${result.totalEntries}** invoices (page ${result.page}/${result.totalPages}).`
    };
  })
  .build();
