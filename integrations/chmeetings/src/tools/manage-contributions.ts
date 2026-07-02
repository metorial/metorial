import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContributions = SlateTool.create(spec, {
  name: 'List Contributions',
  key: 'list_contributions',
  description: `Retrieve contribution (giving) records from ChMeetings. Supports filtering by person, date range, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Filter contributions by person ID'),
      startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      contributions: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of contribution records'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      total: z.number().describe('Total number of contributions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContributions({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      personId: ctx.input.personId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: {
        contributions: result.data as Record<string, unknown>[],
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** contribution(s). Showing page ${result.page}.`
    };
  })
  .build();

export let createContribution = SlateTool.create(spec, {
  name: 'Create Contribution',
  key: 'create_contribution',
  description: `Record a new contribution (donation) in ChMeetings. Requires a person ID, date, and at least one fund allocation. Supports specifying payment method, batch number, check number, and notes.`
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person making the contribution'),
      date: z.string().describe('Contribution date (YYYY-MM-DD)'),
      funds: z
        .array(
          z.object({
            fundName: z.string().describe('Name of the contribution fund'),
            amount: z.number().describe('Amount contributed to this fund')
          })
        )
        .min(1)
        .describe('Fund allocations for the contribution'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method (e.g., Cash, Check, Online, Credit Card)'),
      batchNumber: z.string().optional().describe('Batch number for grouping contributions'),
      checkNumber: z.string().optional().describe('Check number (if payment method is check)'),
      transactionId: z.string().optional().describe('External transaction ID'),
      notes: z.string().optional().describe('Additional notes for the contribution')
    })
  )
  .output(
    z.object({
      contribution: z.record(z.string(), z.unknown()).describe('Created contribution record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createContribution({
      person_id: ctx.input.personId,
      date: ctx.input.date,
      funds: ctx.input.funds.map(f => ({
        fund_name: f.fundName,
        amount: f.amount
      })),
      payment_method: ctx.input.paymentMethod,
      batch_number: ctx.input.batchNumber,
      check_number: ctx.input.checkNumber,
      transaction_id: ctx.input.transactionId,
      notes: ctx.input.notes
    });

    return {
      output: {
        contribution: result.data as Record<string, unknown>
      },
      message: `Created contribution for person **${ctx.input.personId}** on **${ctx.input.date}**.`
    };
  })
  .build();

export let deleteContribution = SlateTool.create(spec, {
  name: 'Delete Contribution',
  key: 'delete_contribution',
  description: `Delete a contribution record from ChMeetings. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contributionId: z.number().describe('ID of the contribution to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContribution(ctx.input.contributionId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted contribution with ID **${ctx.input.contributionId}**.`
    };
  })
  .build();
