import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../lib/client';
import { adfEquals, andFilters } from '../lib/filters';
import { changeIndicator, idField, numberField, stringField } from '../lib/records';
import { pageOutputFields, paginationInputFields, resourceKeySchema } from '../lib/schemas';
import { spec } from '../spec';
import {
  businessUnitSchema,
  invoiceFields,
  invoiceLineFields,
  invoiceLineSchema,
  invoiceSchema,
  mapBusinessUnit,
  mapInvoice,
  mapInvoiceLine
} from './finance/models';
import {
  downloadInvoiceAttachment,
  listInvoiceAttachments,
  listInvoiceHolds,
  listInvoiceInstallments,
  listInvoiceLineDistributions
} from './finance/payables';
import {
  getEligibleInvoice,
  validateInvoiceAmounts,
  validateInvoiceDate
} from './finance/safety';

const invoiceKey = resourceKeySchema.describe(
  'Invoice resourceKey returned by list_invoices, get_invoice, or create_invoice. Do not substitute the numeric invoiceId.'
);
const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveAmount = z.number().finite().positive().max(Number.MAX_SAFE_INTEGER);
const invoiceFilterFields = [
  'InvoiceNumber',
  'SupplierNumber',
  'BusinessUnit',
  'ValidationStatus'
] as const;
const invoiceLineInput = z
  .object({
    amount: positiveAmount.describe(
      'Positive Item line amount in invoice currency. All line amounts must sum exactly to the invoice amount.'
    ),
    description: z
      .string()
      .max(240)
      .optional()
      .describe('Optional item line description, up to 240 characters.'),
    accountingDate: dateInput
      .optional()
      .describe(
        'Optional valid line accounting date in YYYY-MM-DD format. Oracle defaults it from the invoice header when omitted.'
      ),
    distributionCombination: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Optional complete accounting account combination for a single line distribution, valid for the business unit.'
      )
  })
  .strict();

export const listBusinessUnits = SlateTool.create(spec, {
  name: 'List Business Units',
  key: 'list_business_units',
  description:
    'List authorized Oracle Financials business units and discover the business unit name required to create invoices.',
  tags: { readOnly: true }
})
  .input(
    z
      .object({
        ...paginationInputFields,
        name: z
          .string()
          .trim()
          .min(1)
          .max(240)
          .optional()
          .describe('Optional exact business unit name.'),
        active: z
          .boolean()
          .optional()
          .describe('Optional filter for active or inactive business units.')
      })
      .strict()
  )
  .output(
    z.object({
      items: z.array(businessUnitSchema).describe('Business units returned in this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const allowedFields = ['BusinessUnitName', 'ActiveFlag'];
    const q = andFilters(
      ctx.input.name === undefined
        ? undefined
        : adfEquals('BusinessUnitName', ctx.input.name, allowedFields),
      ctx.input.active === undefined
        ? undefined
        : adfEquals('ActiveFlag', ctx.input.active, allowedFields)
    );
    const page = await client.list('fscm', '/finBusinessUnitsLOV', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      orderBy: 'BusinessUnitId:asc',
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapBusinessUnit(client, record)) },
      message: `Returned ${page.count} business units.`
    };
  })
  .build();

export const listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description:
    'List authorized payables invoice headers with exact business filters and discover resource keys for invoice follow-up tools.',
  tags: { readOnly: true }
})
  .input(
    z
      .object({
        ...paginationInputFields,
        invoiceNumber: z
          .string()
          .trim()
          .min(1)
          .max(50)
          .optional()
          .describe('Optional exact supplier invoice number.'),
        supplierNumber: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .optional()
          .describe(
            'Optional exact supplier number. Call list_suppliers to discover supplier numbers.'
          ),
        businessUnit: z
          .string()
          .trim()
          .min(1)
          .max(240)
          .optional()
          .describe(
            'Optional exact invoicing business unit name. Call list_business_units to discover names.'
          ),
        validationStatus: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .optional()
          .describe(
            'Optional exact Oracle validation status, using the value returned by get_invoice or list_invoices.'
          )
      })
      .strict()
  )
  .output(
    z.object({
      items: z.array(invoiceSchema).describe('Invoice headers returned in this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const q = andFilters(
      ctx.input.invoiceNumber === undefined
        ? undefined
        : adfEquals('InvoiceNumber', ctx.input.invoiceNumber, invoiceFilterFields),
      ctx.input.supplierNumber === undefined
        ? undefined
        : adfEquals('SupplierNumber', ctx.input.supplierNumber, invoiceFilterFields),
      ctx.input.businessUnit === undefined
        ? undefined
        : adfEquals('BusinessUnit', ctx.input.businessUnit, invoiceFilterFields),
      ctx.input.validationStatus === undefined
        ? undefined
        : adfEquals('ValidationStatus', ctx.input.validationStatus, invoiceFilterFields)
    );
    const page = await client.list('fscm', '/invoices', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      orderBy: 'InvoiceId:asc',
      fields: invoiceFields,
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapInvoice(client, record)) },
      message: `Returned ${page.count} invoice headers.`
    };
  })
  .build();

export const getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description:
    'Get an authorized payables invoice header and its current validation, approval, payment, and accounting states. Call list_invoices to discover the invoice resource key.',
  tags: { readOnly: true }
})
  .input(z.object({ invoiceKey }).strict())
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const record = await client.get('fscm', '/invoices', ctx.input.invoiceKey, {
      fields: invoiceFields,
      links: 'self'
    });
    return {
      output: mapInvoice(client, record),
      message: 'Retrieved the invoice header and current states.'
    };
  })
  .build();

export const listInvoiceLines = SlateTool.create(spec, {
  name: 'List Invoice Lines',
  key: 'list_invoice_lines',
  description:
    'List a page of invoice lines with amounts, account combinations, and matching and tax details. Call list_invoices or get_invoice to discover the invoice resource key.',
  tags: { readOnly: true }
})
  .input(z.object({ invoiceKey, ...paginationInputFields }).strict())
  .output(
    z.object({
      items: z.array(invoiceLineSchema).describe('Invoice lines returned in this page.'),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const collection = client.childCollectionPath(
      '/invoices',
      ctx.input.invoiceKey,
      'invoiceLines'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: 'LineNumber:asc',
      fields: invoiceLineFields,
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => mapInvoiceLine(client, collection, record))
      },
      message: `Returned ${page.count} invoice lines.`
    };
  })
  .build();

export const createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description:
    'Create a positive Standard payables invoice with unmatched Item lines. Discover the business unit with list_business_units, the supplier number with list_suppliers, and the supplier site with list_supplier_sites.',
  instructions: [
    'Only unmatched Standard invoices with positive Item lines are supported. All line amounts must sum exactly to the invoice amount.',
    'Oracle applies supplier-site and business-unit defaults and enforces account, currency, tax, and mandatory tenant configuration. This operation does not validate, approve, or pay the invoice.',
    'A newly created invoice may initially have unknown statuses. Re-read it with get_invoice before attempting update or deletion. Do not repeat a create request after an uncertain response; first search by its invoice number, supplier number, and business unit.'
  ]
})
  .input(
    z
      .object({
        invoiceNumber: z
          .string()
          .trim()
          .min(1)
          .max(50)
          .describe('Unique supplier invoice number, up to 50 characters.'),
        invoiceDate: dateInput.describe('Valid supplier invoice date in YYYY-MM-DD format.'),
        businessUnit: z
          .string()
          .trim()
          .min(1)
          .max(240)
          .describe('Exact invoicing business unit name from list_business_units.'),
        supplierNumber: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .describe(
            'Exact supplier number from list_suppliers. It is resolved to the supplier name required by Oracle.'
          ),
        supplierSite: z
          .string()
          .trim()
          .min(1)
          .max(240)
          .describe(
            'Exact supplier site name from list_supplier_sites for this supplier and business unit.'
          ),
        currency: z
          .string()
          .trim()
          .min(1)
          .max(15)
          .describe(
            'Oracle invoice currency code, for example USD. Tenant currency and exchange-rate configuration must support it.'
          ),
        amount: positiveAmount.describe(
          'Positive Standard invoice amount in invoice currency, exactly equal to the sum of item line amounts.'
        ),
        lines: z
          .array(invoiceLineInput)
          .min(1)
          .max(100)
          .describe(
            'One to 100 positive, unmatched Item lines. Line numbers are assigned consecutively starting at one.'
          ),
        description: z
          .string()
          .max(240)
          .optional()
          .describe('Optional invoice description, up to 240 characters.'),
        accountingDate: dateInput
          .optional()
          .describe(
            'Optional valid invoice accounting date in YYYY-MM-DD format. Oracle business-unit defaults apply when omitted.'
          )
      })
      .strict()
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    validateInvoiceDate(ctx.input.invoiceDate, 'invoiceDate');
    if (ctx.input.accountingDate !== undefined)
      validateInvoiceDate(ctx.input.accountingDate, 'accountingDate');
    for (const [index, line] of ctx.input.lines.entries()) {
      if (line.accountingDate !== undefined)
        validateInvoiceDate(line.accountingDate, `lines[${index}].accountingDate`);
    }
    validateInvoiceAmounts(ctx.input.amount, ctx.input.lines);
    const client = new OracleFusionClient(ctx.auth);
    // SupplierNumber is absent from the invoice POST schema; resolve its writable Supplier name.
    const suppliers = await client.list('fscm', '/suppliers', {
      limit: 2,
      offset: 0,
      q: adfEquals('SupplierNumber', ctx.input.supplierNumber, ['SupplierNumber']),
      fields: 'SupplierNumber,Supplier',
      links: 'self'
    });
    const supplier = suppliers.items[0];
    const supplierName = supplier && stringField(supplier, 'Supplier');
    if (
      !supplier ||
      suppliers.count !== 1 ||
      suppliers.hasMore ||
      !supplierName?.trim() ||
      stringField(supplier, 'SupplierNumber') !== ctx.input.supplierNumber
    ) {
      throw createApiServiceError(
        'The supplier number must resolve to exactly one authorized supplier with a name. Call list_suppliers and use its supplierNumber.',
        { reason: 'oracle_fusion_invalid_supplier' }
      );
    }
    const body = pickDefined({
      InvoiceNumber: ctx.input.invoiceNumber,
      InvoiceDate: ctx.input.invoiceDate,
      BusinessUnit: ctx.input.businessUnit,
      Supplier: supplierName,
      SupplierSite: ctx.input.supplierSite,
      InvoiceCurrency: ctx.input.currency,
      InvoiceAmount: ctx.input.amount,
      InvoiceType: 'Standard',
      Description: ctx.input.description,
      AccountingDate: ctx.input.accountingDate,
      invoiceLines: ctx.input.lines.map((line, index) =>
        pickDefined({
          LineNumber: index + 1,
          LineType: 'Item',
          LineAmount: line.amount,
          Description: line.description,
          AccountingDate: line.accountingDate,
          DistributionCombination: line.distributionCombination
        })
      )
    });
    let createdKey: string | undefined;
    try {
      const created = await client.create('fscm', '/invoices', body, { links: 'self' });
      const candidateKey = client.resourceKey(created, 'fscm', '/invoices');
      const createdId = idField(created, 'InvoiceId');
      const acceptedAmount = numberField(created, 'InvoiceAmount');
      const expectedIdentity = {
        InvoiceNumber: ctx.input.invoiceNumber,
        SupplierNumber: ctx.input.supplierNumber,
        BusinessUnit: ctx.input.businessUnit,
        SupplierSite: ctx.input.supplierSite,
        InvoiceCurrency: ctx.input.currency,
        InvoiceDate: ctx.input.invoiceDate,
        InvoiceType: 'Standard'
      };
      const matchesIdentity = (record: Record<string, unknown>) =>
        Object.entries(expectedIdentity).every(
          ([field, value]) => stringField(record, field) === value
        );
      if (
        !createdId ||
        !matchesIdentity(created) ||
        acceptedAmount === undefined ||
        acceptedAmount <= 0
      ) {
        throw createApiServiceError(
          'Oracle Fusion did not return the created invoice identity and a positive amount.',
          { reason: 'oracle_fusion_invalid_response' }
        );
      }
      createdKey = candidateKey;
      const record = await client.get('fscm', '/invoices', createdKey, {
        fields: invoiceFields,
        links: 'self'
      });
      // Compare Oracle's accepted amount so tenant currency rounding is not guessed locally.
      if (
        client.resourceKey(record, 'fscm', '/invoices') !== createdKey ||
        idField(record, 'InvoiceId') !== createdId ||
        !matchesIdentity(record) ||
        numberField(record, 'InvoiceAmount') !== acceptedAmount
      ) {
        throw createApiServiceError('Oracle Fusion returned a different created invoice.', {
          reason: 'oracle_fusion_invalid_response'
        });
      }
      return {
        output: mapInvoice(client, record),
        message:
          'Created the Standard invoice with unmatched Item lines. Oracle may still be populating its statuses.'
      };
    } catch (error) {
      const recovery = createdKey
        ? `Read get_invoice with invoiceKey "${createdKey}" and inspect its current state.`
        : 'No trusted invoice key is available. Search list_invoices with the exact invoice number, supplier number, and business unit from this request and inspect the matching invoice.';
      throw createApiServiceError(
        `Oracle invoice creation could not be verified. Creation may have completed. ${recovery} Do not retry creation automatically.`,
        { reason: 'oracle_fusion_created_invoice_unverified', parent: error }
      );
    }
  })
  .build();

export const updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice Description',
  key: 'update_invoice',
  description:
    'Update only the description of an eligible unmatched Standard invoice. Call list_invoices or get_invoice to discover the invoice resource key.',
  instructions: [
    'Requires known unvalidated, unpaid, unaccounted, uncanceled states; approval must be Required or Not required. All lines must be active unmatched Item lines with no observed tax calculation. Unknown states are rejected. Oracle enforces final eligibility.'
  ]
})
  .input(
    z
      .object({
        invoiceKey,
        description: z
          .string()
          .max(240)
          .describe(
            'Replacement invoice description, up to 240 characters. An empty string clears the description.'
          )
      })
      .strict()
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const current = await getEligibleInvoice(client, ctx.input.invoiceKey, 'update');
    const record = await client.patch(
      'fscm',
      '/invoices',
      ctx.input.invoiceKey,
      { Description: ctx.input.description },
      { links: 'self', ifMatch: changeIndicator(current) }
    );
    return { output: mapInvoice(client, record), message: 'Updated the invoice description.' };
  })
  .build();

export const deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description:
    'Permanently delete an eligible unmatched, unvalidated Standard invoice. Call list_invoices or get_invoice to discover the invoice resource key.',
  tags: { destructive: true },
  instructions: [
    'Requires known unvalidated, unpaid, unaccounted, uncanceled states; approval must be Required or Not required. Every line is inspected for matching and tax information before deletion.',
    'Oracle enforces final deletion eligibility, including tax calculation restrictions not fully observable through REST. A rejected deletion is returned as an error; the invoice is never canceled as a fallback.'
  ]
})
  .input(z.object({ invoiceKey }).strict())
  .output(
    z.object({
      deleted: z.literal(true).describe('Whether Oracle confirmed successful deletion.'),
      invoiceKey: invoiceKey.describe('Resource key of the deleted invoice.')
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const current = await getEligibleInvoice(client, ctx.input.invoiceKey, 'delete');
    await client.delete('fscm', '/invoices', ctx.input.invoiceKey, {
      ifMatch: changeIndicator(current)
    });
    return {
      output: { deleted: true as const, invoiceKey: ctx.input.invoiceKey },
      message: 'Deleted the invoice.'
    };
  })
  .build();

export const financeTools = {
  list_business_units: listBusinessUnits,
  list_invoices: listInvoices,
  get_invoice: getInvoice,
  list_invoice_lines: listInvoiceLines,
  list_invoice_installments: listInvoiceInstallments,
  list_invoice_line_distributions: listInvoiceLineDistributions,
  list_invoice_holds: listInvoiceHolds,
  list_invoice_attachments: listInvoiceAttachments,
  download_invoice_attachment: downloadInvoiceAttachment,
  create_invoice: createInvoice,
  update_invoice: updateInvoice,
  delete_invoice: deleteInvoice
};
