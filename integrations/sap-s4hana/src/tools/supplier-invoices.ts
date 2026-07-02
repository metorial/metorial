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

const serviceName = 'API_SUPPLIERINVOICE_PROCESS_SRV';
export const supplierInvoiceItemNavigation = 'to_SuplrInvcItemPurOrdRef';

let supplierInvoiceItemSchema = z.object({
  supplierInvoice: z.string().optional().describe('Supplier invoice id.'),
  fiscalYear: z.string().optional().describe('Fiscal year.'),
  supplierInvoiceItem: z.string().optional().describe('Supplier invoice item number.'),
  purchaseOrder: z.string().optional().describe('Related purchase order id.'),
  purchaseOrderItem: z.string().optional().describe('Related purchase order item.'),
  plant: z.string().optional().describe('Plant for the supplier invoice item.'),
  productType: z.string().optional().describe('SAP product type group for the item.'),
  amountInDocumentCurrency: z.string().optional().describe('Line amount.'),
  documentCurrency: z.string().optional().describe('Document currency.'),
  record: rawRecordSchema
});

export let supplierInvoiceSchema = z.object({
  supplierInvoice: z.string().optional().describe('SAP supplier invoice id.'),
  fiscalYear: z.string().optional().describe('Fiscal year.'),
  companyCode: z.string().optional().describe('Company code.'),
  supplier: z.string().optional().describe('Supplier/invoicing party id.'),
  supplierInvoiceIDByInvcgParty: z
    .string()
    .optional()
    .describe('Supplier invoice reference from invoicing party.'),
  documentDate: z.string().optional().describe('Document date.'),
  postingDate: z.string().optional().describe('Posting date.'),
  invoiceGrossAmount: z.string().optional().describe('Gross invoice amount.'),
  documentCurrency: z.string().optional().describe('Document currency.'),
  accountingDocument: z.string().optional().describe('Accounting document id.'),
  supplierInvoiceStatus: z.string().optional().describe('Supplier invoice status.'),
  paymentBlockingReason: z.string().optional().describe('Payment block reason.'),
  items: z.array(supplierInvoiceItemSchema).optional().describe('Expanded invoice items.'),
  record: rawRecordSchema
});

export let mapSupplierInvoiceItem = (item: Record<string, unknown>) => ({
  ...compactOutput({
    supplierInvoice: stringValue(item, 'SupplierInvoice'),
    fiscalYear: stringValue(item, 'FiscalYear'),
    supplierInvoiceItem: stringValue(item, 'SupplierInvoiceItem'),
    purchaseOrder: stringValue(item, 'PurchaseOrder'),
    purchaseOrderItem: stringValue(item, 'PurchaseOrderItem'),
    plant: stringValue(item, 'Plant'),
    productType: stringValue(item, 'ProductType'),
    amountInDocumentCurrency: stringValue(item, 'SupplierInvoiceItemAmount'),
    documentCurrency: stringValue(item, 'DocumentCurrency')
  }),
  record: item
});

export let mapSupplierInvoice = (invoice: Record<string, unknown>) => {
  let items = navigationArray(invoice, supplierInvoiceItemNavigation).map(
    mapSupplierInvoiceItem
  );

  return {
    ...compactOutput({
      supplierInvoice: stringValue(invoice, 'SupplierInvoice'),
      fiscalYear: stringValue(invoice, 'FiscalYear'),
      companyCode: stringValue(invoice, 'CompanyCode'),
      supplier:
        stringValue(invoice, 'InvoicingParty') ??
        stringValue(invoice, 'Supplier') ??
        stringValue(invoice, 'Payee'),
      supplierInvoiceIDByInvcgParty: stringValue(invoice, 'SupplierInvoiceIDByInvcgParty'),
      documentDate: stringValue(invoice, 'DocumentDate'),
      postingDate: stringValue(invoice, 'PostingDate'),
      invoiceGrossAmount: stringValue(invoice, 'InvoiceGrossAmount'),
      documentCurrency: stringValue(invoice, 'DocumentCurrency'),
      accountingDocument: stringValue(invoice, 'AccountingDocument'),
      supplierInvoiceStatus: stringValue(invoice, 'SupplierInvoiceStatus'),
      paymentBlockingReason: stringValue(invoice, 'PaymentBlockingReason'),
      items: items.length > 0 ? items : undefined
    }),
    record: invoice
  };
};

export let buildSupplierInvoiceFilters = (input: {
  supplierInvoice?: string;
  fiscalYear?: string;
  supplier?: string;
  companyCode?: string;
  postingDateFrom?: string;
  postingDateTo?: string;
}) =>
  andFilters([
    input.supplierInvoice
      ? `SupplierInvoice eq ${odataStringLiteral(input.supplierInvoice)}`
      : undefined,
    input.fiscalYear ? `FiscalYear eq ${odataStringLiteral(input.fiscalYear)}` : undefined,
    input.supplier ? `InvoicingParty eq ${odataStringLiteral(input.supplier)}` : undefined,
    input.companyCode ? `CompanyCode eq ${odataStringLiteral(input.companyCode)}` : undefined,
    input.postingDateFrom
      ? `PostingDate ge ${odataDateTimeLiteral(input.postingDateFrom, 'datetime')}`
      : undefined,
    input.postingDateTo
      ? `PostingDate le ${odataDateTimeLiteral(input.postingDateTo, 'datetime')}`
      : undefined
  ]);

export let listSupplierInvoices = SlateTool.create(spec, {
  name: 'List Supplier Invoices',
  key: 'list_supplier_invoices',
  description:
    'List SAP S/4HANA supplier invoices for accounts payable visibility, purchasing reconciliation, and payment/blocking status checks.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      supplierInvoice: z.string().optional().describe('Exact SAP supplier invoice id.'),
      fiscalYear: z.string().optional().describe('Fiscal year.'),
      supplier: z.string().optional().describe('Supplier/invoicing party id.'),
      companyCode: z.string().optional().describe('Company code.'),
      postingDateFrom: z.string().optional().describe('Posting date from.'),
      postingDateTo: z.string().optional().describe('Posting date to.'),
      expandItems: z.boolean().optional().describe('Expand supplier invoice items.'),
      ...pageInputSchema
    })
  )
  .output(
    z.object({
      supplierInvoices: z.array(supplierInvoiceSchema).describe('Supplier invoices.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureFilteredQuery(
      ctx.input,
      {
        supplierInvoice: ctx.input.supplierInvoice,
        fiscalYear: ctx.input.fiscalYear,
        supplier: ctx.input.supplier,
        companyCode: ctx.input.companyCode,
        postingDateFrom: ctx.input.postingDateFrom,
        postingDateTo: ctx.input.postingDateTo
      },
      'supplier invoice'
    );

    let client = createClient(ctx);
    let result = await client.queryEntitySet<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_SupplierInvoice',
      pageToken: ctx.input.skipToken,
      query: {
        $top: topValue(ctx.input),
        $filter: buildSupplierInvoiceFilters(ctx.input) || undefined,
        $orderby: ctx.input.orderBy,
        $expand: ctx.input.expandItems ? supplierInvoiceItemNavigation : undefined
      }
    });
    let supplierInvoices = result.items.map(mapSupplierInvoice);

    return {
      output: {
        supplierInvoices,
        page: pageSummary(ctx.input, supplierInvoices.length, result.nextPageToken)
      },
      message: `Retrieved **${supplierInvoices.length}** SAP S/4HANA supplier invoice(s).`
    };
  })
  .build();

export let getSupplierInvoice = SlateTool.create(spec, {
  name: 'Get Supplier Invoice',
  key: 'get_supplier_invoice',
  description:
    'Retrieve a SAP S/4HANA supplier invoice by invoice id and fiscal year, including item lines where authorized.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      supplierInvoice: z.string().min(1).describe('SAP supplier invoice id.'),
      fiscalYear: z.string().min(1).describe('Fiscal year for the supplier invoice key.')
    })
  )
  .output(
    z.object({
      supplierInvoice: supplierInvoiceSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let invoice = await client.getEntity<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_SupplierInvoice',
      key: {
        SupplierInvoice: ctx.input.supplierInvoice,
        FiscalYear: ctx.input.fiscalYear
      },
      query: {
        $expand: supplierInvoiceItemNavigation
      }
    });
    let mapped = mapSupplierInvoice(invoice);

    return {
      output: {
        supplierInvoice: mapped
      },
      message: `Retrieved SAP S/4HANA supplier invoice **${mapped.supplierInvoice ?? ctx.input.supplierInvoice}**.`
    };
  })
  .build();
