import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  cleanBody,
  companySlugFor,
  companySlugInput,
  createClient,
  invoiceDraftLineInputSchema,
  invoiceDraftSchema,
  invoiceSchema,
  listMetadata,
  mapInvoice,
  mapInvoiceDraft,
  paginationInputShape,
  paginationOutputShape,
  paginationParams,
  requireInvoiceDraftLineFields
} from './shared';

let roundingTypeSchema = z.enum([
  'none',
  'round_half',
  'round_whole',
  'round_down_half',
  'round_down_whole'
]);

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description:
    'Lists Fiken invoices for a company with filters for customer, invoice number, issue date, due date, last modified date, settled status, order reference, and source draft UUID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      customerId: z.number().int().positive().optional(),
      invoiceNumber: z.string().optional(),
      issueDate: z.string().optional().describe('Exact issue date, YYYY-MM-DD.'),
      issueDateFrom: z.string().optional().describe('Issued on or after this date.'),
      issueDateTo: z.string().optional().describe('Issued on or before this date.'),
      issueDateAfter: z.string().optional().describe('Issued strictly after this date.'),
      issueDateBefore: z.string().optional().describe('Issued strictly before this date.'),
      dueDate: z.string().optional().describe('Exact due date, YYYY-MM-DD.'),
      dueDateFrom: z.string().optional().describe('Due on or after this date.'),
      dueDateTo: z.string().optional().describe('Due on or before this date.'),
      dueDateAfter: z.string().optional().describe('Due strictly after this date.'),
      dueDateBefore: z.string().optional().describe('Due strictly before this date.'),
      lastModified: z.string().optional().describe('Exact last modified date, YYYY-MM-DD.'),
      lastModifiedFrom: z.string().optional().describe('Modified on or after this date.'),
      lastModifiedTo: z.string().optional().describe('Modified on or before this date.'),
      lastModifiedAfter: z.string().optional().describe('Modified strictly after this date.'),
      lastModifiedBefore: z
        .string()
        .optional()
        .describe('Modified strictly before this date.'),
      settled: z.boolean().optional(),
      orderReference: z.string().optional(),
      invoiceDraftUuid: z.string().optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      invoices: z.array(invoiceSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listInvoices(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        customerId: ctx.input.customerId,
        invoiceNumber: ctx.input.invoiceNumber,
        issueDate: ctx.input.issueDate,
        issueDateGe: ctx.input.issueDateFrom,
        issueDateLe: ctx.input.issueDateTo,
        issueDateGt: ctx.input.issueDateAfter,
        issueDateLt: ctx.input.issueDateBefore,
        dueDate: ctx.input.dueDate,
        dueDateGe: ctx.input.dueDateFrom,
        dueDateLe: ctx.input.dueDateTo,
        dueDateGt: ctx.input.dueDateAfter,
        dueDateLt: ctx.input.dueDateBefore,
        lastModified: ctx.input.lastModified,
        lastModifiedGe: ctx.input.lastModifiedFrom,
        lastModifiedLe: ctx.input.lastModifiedTo,
        lastModifiedGt: ctx.input.lastModifiedAfter,
        lastModifiedLt: ctx.input.lastModifiedBefore,
        settled: ctx.input.settled,
        orderReference: ctx.input.orderReference,
        invoiceDraftUuid: ctx.input.invoiceDraftUuid
      })
    );
    let invoices = response.items.map(mapInvoice);

    return {
      output: {
        companySlug,
        invoices,
        ...listMetadata(response)
      },
      message: `Found **${invoices.length}** Fiken invoice${invoices.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description:
    'Retrieves one Fiken invoice by invoice id, including line and attachment metadata returned by Fiken.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      invoiceId: z.number().int().positive().describe('Fiken invoice id, not invoice number.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      invoice: invoiceSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let invoice = mapInvoice(await client.getInvoice(companySlug, ctx.input.invoiceId));

    return {
      output: {
        companySlug,
        invoice
      },
      message: `Retrieved Fiken invoice **${invoice.invoiceNumber ?? ctx.input.invoiceId}**.`
    };
  })
  .build();

export let listInvoiceDrafts = SlateTool.create(spec, {
  name: 'List Invoice Drafts',
  key: 'list_invoice_drafts',
  description:
    'Lists Fiken invoice drafts for a company with optional order reference or draft UUID filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      orderReference: z.string().optional(),
      uuid: z.string().optional().describe('Invoice draft UUID.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      drafts: z.array(invoiceDraftSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listInvoiceDrafts(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        orderReference: ctx.input.orderReference,
        uuid: ctx.input.uuid
      })
    );
    let drafts = response.items.map(mapInvoiceDraft);

    return {
      output: {
        companySlug,
        drafts,
        ...listMetadata(response)
      },
      message: `Found **${drafts.length}** Fiken invoice draft${drafts.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getInvoiceDraft = SlateTool.create(spec, {
  name: 'Get Invoice Draft',
  key: 'get_invoice_draft',
  description: 'Retrieves one Fiken invoice draft by draft id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      draftId: z.number().int().positive().describe('Fiken invoice draft id.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      draft: invoiceDraftSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let draft = mapInvoiceDraft(await client.getInvoiceDraft(companySlug, ctx.input.draftId));

    return {
      output: {
        companySlug,
        draft
      },
      message: `Retrieved Fiken invoice draft **${draft.draftId ?? ctx.input.draftId}**.`
    };
  })
  .build();

export let createInvoiceDraft = SlateTool.create(spec, {
  name: 'Create Invoice Draft',
  key: 'create_invoice_draft',
  description:
    'Creates a reviewable Fiken invoice draft. This does not finalize or send an invoice.',
  constraints: [
    'This tool creates only invoice or cash_invoice drafts, not offers, order confirmations, or credit notes.',
    'For free-text lines without productId, provide description, unitPrice, vatType, and incomeAccount.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      type: z
        .enum(['invoice', 'cash_invoice'])
        .optional()
        .describe('Draft type. Defaults to invoice.'),
      customerId: z
        .number()
        .int()
        .positive()
        .describe('Fiken contact id where customer=true.'),
      daysUntilDueDate: z.number().int().min(0).describe('Days until the invoice is due.'),
      issueDate: z.string().optional().describe('Issue date, YYYY-MM-DD.'),
      invoiceText: z.string().optional().describe('Text printed above the invoice lines.'),
      yourReference: z.string().optional(),
      ourReference: z.string().optional(),
      orderReference: z.string().optional(),
      lines: z.array(invoiceDraftLineInputSchema).min(1).describe('Invoice draft lines.'),
      currency: z.string().length(3).optional().describe('ISO 4217 currency code.'),
      bankAccountNumber: z.string().optional(),
      iban: z.string().optional(),
      bic: z.string().optional(),
      paymentAccount: z
        .string()
        .optional()
        .describe('Payment account, for example 1920:10001.'),
      contactPersonId: z.number().int().positive().optional(),
      projectId: z.number().int().positive().optional(),
      roundingType: roundingTypeSchema.optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      draftId: z.number().optional(),
      location: z.string().optional(),
      draft: invoiceDraftSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    ctx.input.lines.forEach(requireInvoiceDraftLineFields);

    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let created = await client.createInvoiceDraft(
      companySlug,
      cleanBody({
        type: ctx.input.type ?? 'invoice',
        customerId: ctx.input.customerId,
        daysUntilDueDate: ctx.input.daysUntilDueDate,
        issueDate: ctx.input.issueDate,
        invoiceText: ctx.input.invoiceText,
        yourReference: ctx.input.yourReference,
        ourReference: ctx.input.ourReference,
        orderReference: ctx.input.orderReference,
        lines: ctx.input.lines.map(line => cleanBody(line)),
        currency: ctx.input.currency,
        bankAccountNumber: ctx.input.bankAccountNumber,
        iban: ctx.input.iban,
        bic: ctx.input.bic,
        paymentAccount: ctx.input.paymentAccount,
        contactPersonId: ctx.input.contactPersonId,
        projectId: ctx.input.projectId,
        roundingType: ctx.input.roundingType
      })
    );
    let draft = created.record ? mapInvoiceDraft(created.record) : undefined;

    return {
      output: {
        companySlug,
        draftId: draft?.draftId ?? created.id,
        location: created.location,
        draft
      },
      message: `Created Fiken invoice draft **${draft?.draftId ?? created.id ?? 'from request'}**.`
    };
  })
  .build();
