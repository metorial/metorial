import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { lineItemInputSchema, mapLineItemInput } from '../lib/schemas';
import { spec } from '../spec';

let recurringOutputSchema = z.object({
  recurringId: z.string().optional().describe('Recurring document ID'),
  contactId: z.string().optional().describe('Contact ID'),
  contactName: z.string().optional().describe('Contact name'),
  currency: z.string().optional().describe('Currency code'),
  startDate: z.string().optional().describe('Start date'),
  frequency: z.string().optional().describe('Frequency (e.g., "monthly", "weekly")'),
  period: z.number().optional().describe('Period interval'),
  endingCount: z.number().optional().describe('Number of occurrences before ending'),
  endingDate: z.string().optional().describe('End date'),
  documentType: z
    .string()
    .optional()
    .describe('Document type created (invoice, expense, estimate)'),
  state: z.string().optional().describe('State of the recurring document')
});

export let listRecurring = SlateTool.create(spec, {
  name: 'List Recurring Documents',
  key: 'list_recurring',
  description: `Retrieve a list of recurring document templates from Quaderno. Recurring documents automatically create invoices, expenses, or estimates at configurable intervals.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      recurringDocuments: z.array(recurringOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listRecurring({ page: ctx.input.page });

    let recurringDocuments = (Array.isArray(result) ? result : []).map((r: any) => ({
      recurringId: r.id?.toString(),
      contactId: r.contact?.id?.toString() || r.contact_id?.toString(),
      contactName: r.contact?.full_name,
      currency: r.currency,
      startDate: r.start_date,
      frequency: r.frequency,
      period: r.period,
      endingCount: r.ending_count,
      endingDate: r.ending_date,
      documentType: r.document_type,
      state: r.state
    }));

    return {
      output: { recurringDocuments },
      message: `Found **${recurringDocuments.length}** recurring document(s)`
    };
  })
  .build();

export let createRecurring = SlateTool.create(spec, {
  name: 'Create Recurring Document',
  key: 'create_recurring',
  description: `Create a new recurring document in Quaderno. Recurring documents automatically generate invoices, expenses, or estimates at the specified interval.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      currency: z.string().optional().describe('Currency code'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      frequency: z
        .enum([
          'daily',
          'weekly',
          'biweekly',
          'monthly',
          'bimonthly',
          'quarterly',
          'semiyearly',
          'yearly'
        ])
        .describe('Frequency of the recurring document'),
      documentType: z
        .enum(['invoice', 'expense', 'estimate'])
        .optional()
        .describe('Type of document to create'),
      endingCount: z.number().optional().describe('Number of occurrences before ending'),
      endingDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      subject: z.string().optional().describe('Subject line'),
      notes: z.string().optional().describe('Notes'),
      tag: z.string().optional().describe('Tag for categorization'),
      items: z
        .array(lineItemInputSchema)
        .min(1)
        .describe('Line items for the recurring document')
    })
  )
  .output(recurringOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      contact_id: ctx.input.contactId,
      start_date: ctx.input.startDate,
      frequency: ctx.input.frequency,
      items_attributes: ctx.input.items.map(mapLineItemInput)
    };

    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.documentType) data.document_type = ctx.input.documentType;
    if (ctx.input.endingCount !== undefined) data.ending_count = ctx.input.endingCount;
    if (ctx.input.endingDate) data.ending_date = ctx.input.endingDate;
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.tag) data.tag = ctx.input.tag;

    let r = await client.createRecurring(data);

    return {
      output: {
        recurringId: r.id?.toString(),
        contactId: r.contact?.id?.toString() || r.contact_id?.toString(),
        contactName: r.contact?.full_name,
        currency: r.currency,
        startDate: r.start_date,
        frequency: r.frequency,
        period: r.period,
        endingCount: r.ending_count,
        endingDate: r.ending_date,
        documentType: r.document_type,
        state: r.state
      },
      message: `Created **${ctx.input.frequency}** recurring ${ctx.input.documentType || 'document'} starting **${ctx.input.startDate}**`
    };
  })
  .build();

export let deleteRecurring = SlateTool.create(spec, {
  name: 'Delete Recurring Document',
  key: 'delete_recurring',
  description: `Delete a recurring document template from Quaderno. This stops future document generation.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      recurringId: z.string().describe('ID of the recurring document to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the recurring document was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteRecurring(ctx.input.recurringId);

    return {
      output: { success: true },
      message: `Deleted recurring document **${ctx.input.recurringId}**`
    };
  })
  .build();
