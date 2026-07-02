import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  description: z.string().optional().describe('Description'),
  quantity: z.number().optional().describe('Quantity'),
  unitAmount: z.number().optional().describe('Unit price'),
  accountCode: z.string().optional().describe('Account code'),
  taxType: z.string().optional().describe('Tax type code'),
  itemCode: z.string().optional().describe('Item code'),
  discountRate: z.number().optional().describe('Discount percentage')
});

let quoteOutputSchema = z.object({
  quoteId: z.string().optional().describe('Unique Xero quote ID'),
  quoteNumber: z.string().optional().describe('Quote number'),
  reference: z.string().optional().describe('Reference'),
  title: z.string().optional().describe('Quote title'),
  summary: z.string().optional().describe('Quote summary'),
  terms: z.string().optional().describe('Quote terms'),
  status: z
    .string()
    .optional()
    .describe('Status: DRAFT, SENT, ACCEPTED, DECLINED, INVOICED, DELETED'),
  contactName: z.string().optional().describe('Contact name'),
  contactId: z.string().optional().describe('Contact ID'),
  date: z.string().optional().describe('Quote date'),
  expiryDate: z.string().optional().describe('Expiry date'),
  subTotal: z.number().optional().describe('Subtotal'),
  totalTax: z.number().optional().describe('Total tax'),
  total: z.number().optional().describe('Total amount'),
  currencyCode: z.string().optional().describe('Currency code'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapQuote = (q: any) => ({
  quoteId: q.QuoteID,
  quoteNumber: q.QuoteNumber,
  reference: q.Reference,
  title: q.Title,
  summary: q.Summary,
  terms: q.Terms,
  status: q.Status,
  contactName: q.Contact?.Name,
  contactId: q.Contact?.ContactID,
  date: q.DateString || q.Date,
  expiryDate: q.ExpiryDateString || q.ExpiryDate,
  subTotal: q.SubTotal,
  totalTax: q.TotalTax,
  total: q.Total,
  currencyCode: q.CurrencyCode,
  updatedDate: q.UpdatedDateUTC
});

export let createQuote = SlateTool.create(spec, {
  name: 'Create Quote',
  key: 'create_quote',
  description: `Creates a new quote (estimate) in Xero. Quotes can be sent to contacts for approval, then converted to invoices once accepted.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID for the quote'),
      lineItems: z.array(lineItemSchema).min(1).describe('Line items for the quote'),
      date: z.string().optional().describe('Quote date (YYYY-MM-DD)'),
      expiryDate: z.string().optional().describe('Expiry date (YYYY-MM-DD)'),
      title: z.string().optional().describe('Quote title'),
      summary: z.string().optional().describe('Quote summary'),
      terms: z.string().optional().describe('Terms and conditions'),
      reference: z.string().optional().describe('Reference'),
      status: z.enum(['DRAFT', 'SENT']).optional().describe('Initial status'),
      lineAmountTypes: z
        .enum(['Exclusive', 'Inclusive', 'NoTax'])
        .optional()
        .describe('How amounts are calculated'),
      currencyCode: z.string().optional().describe('Currency code')
    })
  )
  .output(quoteOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let quote = await client.createQuote({
      Contact: { ContactID: ctx.input.contactId },
      LineItems: ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        ItemCode: li.itemCode,
        DiscountRate: li.discountRate
      })),
      Date: ctx.input.date,
      ExpiryDate: ctx.input.expiryDate,
      Title: ctx.input.title,
      Summary: ctx.input.summary,
      Terms: ctx.input.terms,
      Reference: ctx.input.reference,
      Status: ctx.input.status || 'DRAFT',
      LineAmountTypes: ctx.input.lineAmountTypes,
      CurrencyCode: ctx.input.currencyCode
    });

    let output = mapQuote(quote);

    return {
      output,
      message: `Created quote **${output.quoteNumber || output.quoteId}** for **${output.total?.toFixed(2)} ${output.currencyCode || ''}** — ${output.contactName}.`
    };
  })
  .build();

export let listQuotes = SlateTool.create(spec, {
  name: 'List Quotes',
  key: 'list_quotes',
  description: `Lists quotes from Xero with filtering options. Filter by status, contact, date range, or expiry date.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      status: z
        .string()
        .optional()
        .describe('Filter by status: DRAFT, SENT, ACCEPTED, DECLINED, INVOICED, DELETED'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      expiryDateFrom: z.string().optional().describe('Expiry start date filter'),
      expiryDateTo: z.string().optional().describe('Expiry end date filter'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return quotes modified after this date (ISO 8601)'),
      order: z.string().optional().describe('Order results')
    })
  )
  .output(
    z.object({
      quotes: z.array(quoteOutputSchema).describe('List of quotes'),
      count: z.number().describe('Number of quotes returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getQuotes({
      page: ctx.input.page,
      status: ctx.input.status,
      contactId: ctx.input.contactId,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      expiryDateFrom: ctx.input.expiryDateFrom,
      expiryDateTo: ctx.input.expiryDateTo,
      modifiedAfter: ctx.input.modifiedAfter,
      order: ctx.input.order
    });

    let quotes = (result.Quotes || []).map(mapQuote);

    return {
      output: { quotes, count: quotes.length },
      message: `Found **${quotes.length}** quote(s).`
    };
  })
  .build();

export let updateQuote = SlateTool.create(spec, {
  name: 'Update Quote',
  key: 'update_quote',
  description: `Updates an existing quote in Xero. Can modify status, line items, dates, and other details.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      quoteId: z.string().describe('The Xero quote ID to update'),
      status: z
        .enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'DELETED'])
        .optional()
        .describe('New status'),
      contactId: z.string().optional().describe('New contact ID'),
      lineItems: z.array(lineItemSchema).optional().describe('Replacement line items'),
      date: z.string().optional().describe('New date'),
      expiryDate: z.string().optional().describe('New expiry date'),
      title: z.string().optional().describe('New title'),
      summary: z.string().optional().describe('New summary'),
      terms: z.string().optional().describe('New terms'),
      reference: z.string().optional().describe('New reference')
    })
  )
  .output(quoteOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.status) updateData.Status = ctx.input.status;
    if (ctx.input.contactId) updateData.Contact = { ContactID: ctx.input.contactId };
    if (ctx.input.date) updateData.Date = ctx.input.date;
    if (ctx.input.expiryDate) updateData.ExpiryDate = ctx.input.expiryDate;
    if (ctx.input.title) updateData.Title = ctx.input.title;
    if (ctx.input.summary) updateData.Summary = ctx.input.summary;
    if (ctx.input.terms) updateData.Terms = ctx.input.terms;
    if (ctx.input.reference) updateData.Reference = ctx.input.reference;

    if (ctx.input.lineItems) {
      updateData.LineItems = ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        ItemCode: li.itemCode,
        DiscountRate: li.discountRate
      }));
    }

    let quote = await client.updateQuote(ctx.input.quoteId, updateData);
    let output = mapQuote(quote);

    return {
      output,
      message: `Updated quote **${output.quoteNumber || output.quoteId}** — Status: **${output.status}**.`
    };
  })
  .build();
