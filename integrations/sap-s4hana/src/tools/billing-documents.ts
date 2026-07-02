import { SlateTool } from 'slates';
import { z } from 'zod';
import { andFilters, odataDateTimeLiteral, odataStringLiteral } from '../lib/client';
import { spec } from '../spec';
import {
  compactOutput,
  createClient,
  ensureFilteredQuery,
  navigationArray,
  pageInputSchema,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  stringValue,
  topValue
} from './shared';

const serviceName = 'API_BILLING_DOCUMENT_SRV';

let billingDocumentItemSchema = z.object({
  billingDocument: z.string().optional().describe('Billing document id.'),
  billingDocumentItem: z.string().optional().describe('Billing document item number.'),
  salesDocument: z.string().optional().describe('Related sales document id.'),
  material: z.string().optional().describe('Material/product id.'),
  billingQuantity: z.string().optional().describe('Billing quantity.'),
  netAmount: z.string().optional().describe('Item net amount.'),
  transactionCurrency: z.string().optional().describe('Transaction currency.'),
  record: rawRecordSchema
});

let billingDocumentSchema = z.object({
  billingDocument: z.string().optional().describe('SAP billing document id.'),
  billingDocumentType: z.string().optional().describe('Billing document type.'),
  billingDocumentDate: z.string().optional().describe('Billing date.'),
  payerParty: z.string().optional().describe('Payer party id.'),
  soldToParty: z.string().optional().describe('Sold-to party id.'),
  accountingDocument: z.string().optional().describe('Accounting document id.'),
  accountingPostingStatus: z
    .string()
    .optional()
    .describe('Posting status of the billing document.'),
  accountingTransferStatus: z
    .string()
    .optional()
    .describe('Status for transfer to accounting.'),
  totalNetAmount: z.string().optional().describe('Total net amount.'),
  totalGrossAmount: z.string().optional().describe('Total gross amount.'),
  transactionCurrency: z.string().optional().describe('Transaction currency.'),
  items: z.array(billingDocumentItemSchema).optional().describe('Expanded billing items.'),
  record: rawRecordSchema
});

let mapBillingDocumentItem = (item: Record<string, unknown>) => ({
  ...compactOutput({
    billingDocument: stringValue(item, 'BillingDocument'),
    billingDocumentItem: stringValue(item, 'BillingDocumentItem'),
    salesDocument: stringValue(item, 'SalesDocument'),
    material: stringValue(item, 'Material'),
    billingQuantity: stringValue(item, 'BillingQuantity'),
    netAmount: stringValue(item, 'NetAmount'),
    transactionCurrency: stringValue(item, 'TransactionCurrency')
  }),
  record: item
});

let mapBillingDocument = (document: Record<string, unknown>) => {
  let items = navigationArray(document, 'to_Item').map(mapBillingDocumentItem);

  return {
    ...compactOutput({
      billingDocument: stringValue(document, 'BillingDocument'),
      billingDocumentType: stringValue(document, 'BillingDocumentType'),
      billingDocumentDate: stringValue(document, 'BillingDocumentDate'),
      payerParty: stringValue(document, 'PayerParty'),
      soldToParty: stringValue(document, 'SoldToParty'),
      accountingDocument: stringValue(document, 'AccountingDocument'),
      accountingPostingStatus: stringValue(document, 'AccountingPostingStatus'),
      accountingTransferStatus: stringValue(document, 'AccountingTransferStatus'),
      totalNetAmount: stringValue(document, 'TotalNetAmount'),
      totalGrossAmount: stringValue(document, 'TotalGrossAmount'),
      transactionCurrency: stringValue(document, 'TransactionCurrency'),
      items: items.length > 0 ? items : undefined
    }),
    record: document
  };
};

let buildBillingDocumentFilters = (input: {
  billingDocument?: string;
  payer?: string;
  soldToParty?: string;
  billingDateFrom?: string;
  billingDateTo?: string;
  accountingDocument?: string;
}) =>
  andFilters([
    input.billingDocument
      ? `BillingDocument eq ${odataStringLiteral(input.billingDocument)}`
      : undefined,
    input.payer ? `PayerParty eq ${odataStringLiteral(input.payer)}` : undefined,
    input.soldToParty ? `SoldToParty eq ${odataStringLiteral(input.soldToParty)}` : undefined,
    input.accountingDocument
      ? `AccountingDocument eq ${odataStringLiteral(input.accountingDocument)}`
      : undefined,
    input.billingDateFrom
      ? `BillingDocumentDate ge ${odataDateTimeLiteral(input.billingDateFrom, 'datetime')}`
      : undefined,
    input.billingDateTo
      ? `BillingDocumentDate le ${odataDateTimeLiteral(input.billingDateTo, 'datetime')}`
      : undefined
  ]);

export let listBillingDocuments = SlateTool.create(spec, {
  name: 'List Billing Documents',
  key: 'list_billing_documents',
  description:
    'List SAP S/4HANA billing documents for invoice lookup, customer reporting, and accounting reconciliation.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      billingDocument: z.string().optional().describe('Exact SAP billing document id.'),
      payer: z.string().optional().describe('Payer party id.'),
      soldToParty: z.string().optional().describe('Sold-to party id.'),
      billingDateFrom: z.string().optional().describe('Billing date from.'),
      billingDateTo: z.string().optional().describe('Billing date to.'),
      accountingDocument: z.string().optional().describe('Related accounting document id.'),
      expandItems: z.boolean().optional().describe('Expand billing document items.'),
      ...pageInputSchema
    })
  )
  .output(
    z.object({
      billingDocuments: z.array(billingDocumentSchema).describe('Billing documents.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureFilteredQuery(
      ctx.input,
      {
        billingDocument: ctx.input.billingDocument,
        payer: ctx.input.payer,
        soldToParty: ctx.input.soldToParty,
        billingDateFrom: ctx.input.billingDateFrom,
        billingDateTo: ctx.input.billingDateTo,
        accountingDocument: ctx.input.accountingDocument
      },
      'billing document'
    );

    let client = createClient(ctx);
    let result = await client.queryEntitySet<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_BillingDocument',
      pageToken: ctx.input.skipToken,
      query: {
        $top: topValue(ctx.input),
        $filter: buildBillingDocumentFilters(ctx.input) || undefined,
        $orderby: ctx.input.orderBy,
        $expand: ctx.input.expandItems ? 'to_Item' : undefined
      }
    });
    let billingDocuments = result.items.map(mapBillingDocument);

    return {
      output: {
        billingDocuments,
        page: pageSummary(ctx.input, billingDocuments.length, result.nextPageToken)
      },
      message: `Retrieved **${billingDocuments.length}** SAP S/4HANA billing document(s).`
    };
  })
  .build();

export let getBillingDocument = SlateTool.create(spec, {
  name: 'Get Billing Document',
  key: 'get_billing_document',
  description:
    'Retrieve a SAP S/4HANA billing document by id, including item lines where authorized.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      billingDocument: z.string().min(1).describe('SAP billing document id.')
    })
  )
  .output(
    z.object({
      billingDocument: billingDocumentSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let document = await client.getEntity<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_BillingDocument',
      key: ctx.input.billingDocument,
      query: {
        $expand: 'to_Item'
      }
    });
    let mapped = mapBillingDocument(document);

    return {
      output: {
        billingDocument: mapped
      },
      message: `Retrieved SAP S/4HANA billing document **${mapped.billingDocument ?? ctx.input.billingDocument}**.`
    };
  })
  .build();
