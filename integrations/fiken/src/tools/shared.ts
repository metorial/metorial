import { pickDefined } from 'slates';
import { z } from 'zod';
import type { FikenAuthOutput } from '../auth';
import type { FikenConfig } from '../config';
import { FikenClient, type FikenListResponse } from '../lib/client';
import { fikenValidationError } from '../lib/errors';

export type ToolContext = {
  auth: FikenAuthOutput;
  config: FikenConfig;
};

export let rawRecordSchema = z.record(z.string(), z.any()).describe('Raw Fiken record');

export let paginationInputShape = {
  page: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Fiken page number. Pages are zero-indexed. Defaults to 0.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Number of records to return, up to 100. Defaults to 25.')
};

export let companySlugInput = z
  .string()
  .optional()
  .describe('Fiken company slug. Omit only when defaultCompanySlug is configured.');

export let paginationOutputShape = {
  page: z.number().optional(),
  pageSize: z.number().optional(),
  pageCount: z.number().optional(),
  resultCount: z.number().optional(),
  nextPage: z.number().optional()
};

export let addressInputSchema = z
  .object({
    streetAddress: z.string().optional(),
    streetAddressLine2: z.string().optional(),
    city: z.string().optional(),
    postCode: z.string().optional(),
    country: z.string().describe('Country name, for example Norway.')
  })
  .describe('Fiken address.');

export let addressOutputSchema = z
  .object({
    streetAddress: z.string().optional(),
    streetAddressLine2: z.string().optional(),
    city: z.string().optional(),
    postCode: z.string().optional(),
    country: z.string().optional()
  })
  .optional();

export let attachmentMetadataSchema = z.object({
  identifier: z.string().optional(),
  downloadUrl: z.string().optional(),
  downloadUrlWithFikenNormalUserCredentials: z.string().optional(),
  comment: z.string().optional(),
  type: z.string().optional()
});

export let contactNoteSchema = z.object({
  author: z.string().optional(),
  note: z.string().optional()
});

export let contactPersonSchema = z.object({
  contactPersonId: z.number().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: addressOutputSchema
});

export let companySchema = z.object({
  companySlug: z.string().optional(),
  name: z.string().optional(),
  organizationNumber: z.string().optional(),
  vatType: z.string().optional(),
  email: z.string().optional(),
  creationDate: z.string().optional(),
  hasApiAccess: z.boolean().optional(),
  testCompany: z.boolean().optional(),
  accountingStartDate: z.string().optional(),
  vatRegistrationDate: z.string().optional(),
  address: addressOutputSchema,
  raw: rawRecordSchema
});

export let contactSchema = z.object({
  contactId: z.number().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  organizationNumber: z.string().optional(),
  customerNumber: z.number().optional(),
  supplierNumber: z.number().optional(),
  memberNumberString: z.string().optional(),
  customerAccountCode: z.string().optional(),
  supplierAccountCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  customer: z.boolean().optional(),
  supplier: z.boolean().optional(),
  inactive: z.boolean().optional(),
  currency: z.string().optional(),
  language: z.string().nullable().optional(),
  daysUntilInvoicingDueDate: z.number().optional(),
  discount: z.number().optional(),
  createdDate: z.string().optional(),
  lastModifiedDate: z.string().optional(),
  address: addressOutputSchema,
  groups: z.array(z.string()).optional(),
  documents: z.array(attachmentMetadataSchema).optional(),
  notes: z.array(contactNoteSchema).optional(),
  contactPerson: z.array(contactPersonSchema).optional(),
  groupCount: z.number().optional(),
  documentCount: z.number().optional(),
  raw: rawRecordSchema
});

export let attachmentSummaryShape = {
  attachmentCount: z.number().optional()
};

export let invoiceLineSchema = z.object({
  draftLineId: z.number().optional(),
  lastModifiedDate: z.string().optional(),
  productId: z.number().optional(),
  productName: z.string().optional(),
  description: z.string().optional(),
  comment: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  net: z.number().optional(),
  vat: z.number().optional(),
  gross: z.number().optional(),
  netInNok: z.number().optional(),
  vatInNok: z.number().optional(),
  grossInNok: z.number().optional(),
  vatInPercent: z.number().optional(),
  vatType: z.string().optional(),
  incomeAccount: z.string().optional(),
  raw: rawRecordSchema
});

export let invoiceSchema = z.object({
  invoiceId: z.number().optional(),
  invoiceNumber: z.number().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  originalDueDate: z.string().optional(),
  createdDate: z.string().optional(),
  lastModifiedDate: z.string().optional(),
  currency: z.string().optional(),
  net: z.number().optional(),
  vat: z.number().optional(),
  gross: z.number().optional(),
  netInNok: z.number().optional(),
  vatInNok: z.number().optional(),
  grossInNok: z.number().optional(),
  settled: z.boolean().optional(),
  cash: z.boolean().optional(),
  sentManually: z.boolean().optional(),
  kid: z.string().optional(),
  invoiceText: z.string().optional(),
  yourReference: z.string().optional(),
  ourReference: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  projectId: z.number().optional(),
  saleId: z.number().optional(),
  orderReference: z.string().optional(),
  invoiceDraftUuid: z.string().optional(),
  associatedCreditNotes: z.array(z.number()).optional(),
  lines: z.array(invoiceLineSchema).optional(),
  invoicePdf: attachmentMetadataSchema.optional(),
  attachments: z.array(attachmentMetadataSchema).optional(),
  lineCount: z.number().optional(),
  ...attachmentSummaryShape,
  raw: rawRecordSchema
});

export let invoiceDraftLineInputSchema = z.object({
  productId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Product id. If omitted, provide description, unitPrice, vatType, and incomeAccount.'
    ),
  description: z.string().max(200).optional(),
  unitPrice: z.number().int().optional().describe('Net unit price in cents.'),
  vatType: z.string().optional().describe('Fiken VAT type, for example HIGH or NONE.'),
  incomeAccount: z.string().optional().describe('Income account, for example 3000.'),
  quantity: z.number().positive().describe('Number of units to invoice.'),
  discount: z.number().min(0).max(100).optional(),
  comment: z.string().max(200).optional()
});

export let invoiceDraftSchema = z.object({
  draftId: z.number().optional(),
  uuid: z.string().optional(),
  type: z.string().optional(),
  lastModifiedDate: z.string().optional(),
  issueDate: z.string().optional(),
  daysUntilDueDate: z.number().optional(),
  invoiceText: z.string().optional(),
  currency: z.string().optional(),
  yourReference: z.string().optional(),
  ourReference: z.string().optional(),
  orderReference: z.string().optional(),
  net: z.number().optional(),
  gross: z.number().optional(),
  bankAccountNumber: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  paymentAccount: z.string().optional(),
  createdFromInvoiceId: z.number().optional(),
  customers: z.array(contactSchema).optional(),
  lines: z.array(invoiceLineSchema).optional(),
  attachments: z.array(attachmentMetadataSchema).optional(),
  customerCount: z.number().optional(),
  lineCount: z.number().optional(),
  projectId: z.number().optional(),
  roundingType: z.string().optional(),
  ...attachmentSummaryShape,
  raw: rawRecordSchema
});

export let productSchema = z.object({
  productId: z.number().optional(),
  name: z.string().optional(),
  productNumber: z.string().optional(),
  unitPrice: z.number().optional(),
  incomeAccount: z.string().optional(),
  vatType: z.string().optional(),
  active: z.boolean().optional(),
  stock: z.number().optional(),
  note: z.string().optional(),
  createdDate: z.string().optional(),
  lastModifiedDate: z.string().optional(),
  raw: rawRecordSchema
});

export let projectSchema = z.object({
  projectId: z.number().optional(),
  number: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  contactId: z.number().optional(),
  contactName: z.string().optional(),
  completed: z.boolean().optional(),
  raw: rawRecordSchema
});

export let purchaseSchema = z.object({
  purchaseId: z.number().optional(),
  transactionId: z.number().optional(),
  identifier: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  kind: z.string().optional(),
  paid: z.boolean().optional(),
  settled: z.boolean().optional(),
  settledDate: z.string().optional(),
  currency: z.string().optional(),
  supplierId: z.number().optional(),
  supplierName: z.string().optional(),
  lineCount: z.number().optional(),
  paymentCount: z.number().optional(),
  attachmentCount: z.number().optional(),
  deleted: z.boolean().optional(),
  raw: rawRecordSchema
});

export let saleSchema = z.object({
  saleId: z.number().optional(),
  transactionId: z.number().optional(),
  saleNumber: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  kind: z.string().optional(),
  netAmount: z.number().optional(),
  vatAmount: z.number().optional(),
  settled: z.boolean().optional(),
  settledDate: z.string().optional(),
  totalPaid: z.number().optional(),
  outstandingBalance: z.number().optional(),
  currency: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  lineCount: z.number().optional(),
  paymentCount: z.number().optional(),
  attachmentCount: z.number().optional(),
  writeOff: z.boolean().optional(),
  deleted: z.boolean().optional(),
  raw: rawRecordSchema
});

export let accountSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  raw: rawRecordSchema
});

export let accountBalanceSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  balance: z.number().optional(),
  raw: rawRecordSchema
});

export let createClient = (ctx: ToolContext) => new FikenClient(ctx.auth);

export let companySlugFor = (ctx: ToolContext, inputCompanySlug?: string) => {
  let slug = inputCompanySlug?.trim() || ctx.config.defaultCompanySlug?.trim();
  if (!slug) {
    throw fikenValidationError(
      'companySlug is required. Provide companySlug or configure defaultCompanySlug.'
    );
  }

  return slug;
};

export let asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export let asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export let asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

export let asNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

export let asBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

export let asNullableString = (value: unknown) =>
  value === null || typeof value === 'string' ? value : undefined;

export let mapAddress = (value: unknown): z.infer<typeof addressOutputSchema> | undefined => {
  let record = asRecord(value);
  if (Object.keys(record).length === 0) return undefined;

  return {
    streetAddress: asString(record.streetAddress),
    streetAddressLine2: asString(record.streetAddressLine2),
    city: asString(record.city),
    postCode: asString(record.postCode),
    country: asString(record.country)
  };
};

export let mapAttachment = (value: unknown): z.infer<typeof attachmentMetadataSchema> => {
  let record = asRecord(value);
  return {
    identifier: asString(record.identifier),
    downloadUrl: asString(record.downloadUrl),
    downloadUrlWithFikenNormalUserCredentials: asString(
      record.downloadUrlWithFikenNormalUserCredentials
    ),
    comment: asString(record.comment),
    type: asString(record.type)
  };
};

let mapContactNote = (value: unknown): z.infer<typeof contactNoteSchema> => {
  let record = asRecord(value);
  return {
    author: asString(record.author),
    note: asString(record.note)
  };
};

let mapContactPerson = (value: unknown): z.infer<typeof contactPersonSchema> => {
  let record = asRecord(value);
  return {
    contactPersonId: asNumber(record.contactPersonId),
    name: asString(record.name),
    email: asString(record.email),
    phoneNumber: asString(record.phoneNumber),
    address: mapAddress(record.address)
  };
};

export let mapCompany = (value: unknown): z.infer<typeof companySchema> => {
  let record = asRecord(value);
  return {
    companySlug: asString(record.slug),
    name: asString(record.name),
    organizationNumber: asString(record.organizationNumber),
    vatType: asString(record.vatType),
    email: asString(record.email),
    creationDate: asString(record.creationDate),
    hasApiAccess: asBoolean(record.hasApiAccess),
    testCompany: asBoolean(record.testCompany),
    accountingStartDate: asString(record.accountingStartDate),
    vatRegistrationDate: asString(record.vatRegistrationDate),
    address: mapAddress(record.address),
    raw: record
  };
};

export let mapContact = (value: unknown): z.infer<typeof contactSchema> => {
  let record = asRecord(value);
  return {
    contactId: asNumber(record.contactId),
    name: asString(record.name),
    email: asString(record.email),
    organizationNumber: asString(record.organizationNumber),
    customerNumber: asNumber(record.customerNumber),
    supplierNumber: asNumber(record.supplierNumber),
    memberNumberString: asString(record.memberNumberString),
    customerAccountCode: asString(record.customerAccountCode),
    supplierAccountCode: asString(record.supplierAccountCode),
    phoneNumber: asString(record.phoneNumber),
    bankAccountNumber: asString(record.bankAccountNumber),
    customer: asBoolean(record.customer),
    supplier: asBoolean(record.supplier),
    inactive: asBoolean(record.inactive),
    currency: asString(record.currency),
    language: asNullableString(record.language),
    daysUntilInvoicingDueDate: asNumber(record.daysUntilInvoicingDueDate),
    discount: asNumber(record.discount),
    createdDate: asString(record.createdDate),
    lastModifiedDate: asString(record.lastModifiedDate),
    address: mapAddress(record.address),
    groups: Array.isArray(record.groups)
      ? record.groups.filter((group): group is string => typeof group === 'string')
      : undefined,
    documents: Array.isArray(record.documents)
      ? record.documents.map(mapAttachment)
      : undefined,
    notes: Array.isArray(record.notes) ? record.notes.map(mapContactNote) : undefined,
    contactPerson: Array.isArray(record.contactPerson)
      ? record.contactPerson.map(mapContactPerson)
      : undefined,
    groupCount: Array.isArray(record.groups) ? record.groups.length : undefined,
    documentCount: Array.isArray(record.documents) ? record.documents.length : undefined,
    raw: record
  };
};

let mapInvoiceLine = (value: unknown): z.infer<typeof invoiceLineSchema> => {
  let record = asRecord(value);
  return {
    draftLineId: asNumber(record.invoiceishDraftLineId),
    lastModifiedDate: asString(record.lastModifiedDate),
    productId: asNumber(record.productId),
    productName: asString(record.productName),
    description: asString(record.description),
    comment: asString(record.comment),
    quantity: asNumber(record.quantity),
    unitPrice: asNumber(record.unitPrice),
    discount: asNumber(record.discount),
    net: asNumber(record.net),
    vat: asNumber(record.vat),
    gross: asNumber(record.gross),
    netInNok: asNumber(record.netInNok),
    vatInNok: asNumber(record.vatInNok),
    grossInNok: asNumber(record.grossInNok),
    vatInPercent: asNumber(record.vatInPercent),
    vatType: asString(record.vatType),
    incomeAccount: asString(record.incomeAccount),
    raw: record
  };
};

export let mapInvoice = (value: unknown): z.infer<typeof invoiceSchema> => {
  let record = asRecord(value);
  let customer = asRecord(record.customer);
  let project = asRecord(record.project);
  let sale = asRecord(record.sale);
  let lines = asArray(record.lines);
  let attachments = asArray(record.attachments);
  let invoicePdf = Object.keys(asRecord(record.invoicePdf)).length
    ? mapAttachment(record.invoicePdf)
    : undefined;
  let mappedAttachments = attachments.map(mapAttachment);
  let mappedLines = lines.map(mapInvoiceLine);

  return {
    invoiceId: asNumber(record.invoiceId),
    invoiceNumber: asNumber(record.invoiceNumber),
    issueDate: asString(record.issueDate),
    dueDate: asString(record.dueDate),
    originalDueDate: asString(record.originalDueDate),
    createdDate: asString(record.createdDate),
    lastModifiedDate: asString(record.lastModifiedDate),
    currency: asString(record.currency),
    net: asNumber(record.net),
    vat: asNumber(record.vat),
    gross: asNumber(record.gross),
    netInNok: asNumber(record.netInNok),
    vatInNok: asNumber(record.vatInNok),
    grossInNok: asNumber(record.grossInNok),
    settled: asBoolean(record.settled),
    cash: asBoolean(record.cash),
    sentManually: asBoolean(record.sentManually),
    kid: asString(record.kid),
    invoiceText: asString(record.invoiceText),
    yourReference: asString(record.yourReference),
    ourReference: asString(record.ourReference),
    bankAccountNumber: asString(record.bankAccountNumber),
    customerId: asNumber(customer.contactId),
    customerName: asString(customer.name),
    projectId: asNumber(project.projectId),
    saleId: asNumber(sale.saleId),
    orderReference: asString(record.orderReference),
    invoiceDraftUuid: asString(record.invoiceDraftUuid),
    associatedCreditNotes: Array.isArray(record.associatedCreditNotes)
      ? record.associatedCreditNotes.filter(
          (creditNoteId): creditNoteId is number => typeof creditNoteId === 'number'
        )
      : undefined,
    lines: mappedLines,
    invoicePdf,
    attachments: mappedAttachments,
    lineCount: lines.length,
    attachmentCount: mappedAttachments.length + (invoicePdf ? 1 : 0),
    raw: {
      ...record,
      lines: mappedLines
    }
  };
};

export let mapInvoiceDraft = (value: unknown): z.infer<typeof invoiceDraftSchema> => {
  let record = asRecord(value);
  let customers = asArray(record.customers);
  let lines = asArray(record.lines);
  let attachments = asArray(record.attachments);
  let mappedCustomers = customers.map(mapContact);
  let mappedLines = lines.map(mapInvoiceLine);
  let mappedAttachments = attachments.map(mapAttachment);

  return {
    draftId: asNumber(record.draftId),
    uuid: asString(record.uuid),
    type: asString(record.type),
    lastModifiedDate: asString(record.lastModifiedDate),
    issueDate: asString(record.issueDate),
    daysUntilDueDate: asNumber(record.daysUntilDueDate),
    invoiceText: asString(record.invoiceText),
    currency: asString(record.currency),
    yourReference: asString(record.yourReference),
    ourReference: asString(record.ourReference),
    orderReference: asString(record.orderReference),
    net: asNumber(record.net),
    gross: asNumber(record.gross),
    bankAccountNumber: asString(record.bankAccountNumber),
    iban: asString(record.iban),
    bic: asString(record.bic),
    paymentAccount: asString(record.paymentAccount),
    createdFromInvoiceId: asNumber(record.createdFromInvoiceId),
    customers: mappedCustomers,
    lines: mappedLines,
    attachments: mappedAttachments,
    customerCount: customers.length,
    lineCount: lines.length,
    projectId: asNumber(record.projectId),
    roundingType: asString(record.roundingType),
    attachmentCount: attachments.length,
    raw: {
      ...record,
      customers: mappedCustomers,
      lines: mappedLines,
      attachments: mappedAttachments
    }
  };
};

export let mapProduct = (value: unknown): z.infer<typeof productSchema> => {
  let record = asRecord(value);
  return {
    productId: asNumber(record.productId),
    name: asString(record.name),
    productNumber: asString(record.productNumber),
    unitPrice: asNumber(record.unitPrice),
    incomeAccount: asString(record.incomeAccount),
    vatType: asString(record.vatType),
    active: asBoolean(record.active),
    stock: asNumber(record.stock),
    note: asString(record.note),
    createdDate: asString(record.createdDate),
    lastModifiedDate: asString(record.lastModifiedDate),
    raw: record
  };
};

export let mapProject = (value: unknown): z.infer<typeof projectSchema> => {
  let record = asRecord(value);
  let contact = asRecord(record.contact);
  return {
    projectId: asNumber(record.projectId),
    number: asString(record.number),
    name: asString(record.name),
    description: asString(record.description),
    startDate: asString(record.startDate),
    endDate: asString(record.endDate),
    contactId: asNumber(contact.contactId),
    contactName: asString(contact.name),
    completed: asBoolean(record.completed),
    raw: record
  };
};

export let mapPurchase = (value: unknown): z.infer<typeof purchaseSchema> => {
  let record = asRecord(value);
  let supplier = asRecord(record.supplier);
  return {
    purchaseId: asNumber(record.purchaseId),
    transactionId: asNumber(record.transactionId),
    identifier: asString(record.identifier),
    date: asString(record.date),
    dueDate: asString(record.dueDate),
    kind: asString(record.kind),
    paid: asBoolean(record.paid),
    settled: asBoolean(record.settled),
    settledDate: asString(record.settledDate),
    currency: asString(record.currency),
    supplierId: asNumber(supplier.contactId),
    supplierName: asString(supplier.name),
    lineCount: asArray(record.lines).length,
    paymentCount: asArray(record.payments).length,
    attachmentCount: asArray(record.purchaseAttachments).length,
    deleted: asBoolean(record.deleted),
    raw: record
  };
};

export let mapSale = (value: unknown): z.infer<typeof saleSchema> => {
  let record = asRecord(value);
  let customer = asRecord(record.customer);
  return {
    saleId: asNumber(record.saleId),
    transactionId: asNumber(record.transactionId),
    saleNumber: asString(record.saleNumber),
    date: asString(record.date),
    dueDate: asString(record.dueDate),
    kind: asString(record.kind),
    netAmount: asNumber(record.netAmount),
    vatAmount: asNumber(record.vatAmount),
    settled: asBoolean(record.settled),
    settledDate: asString(record.settledDate),
    totalPaid: asNumber(record.totalPaid),
    outstandingBalance: asNumber(record.outstandingBalance),
    currency: asString(record.currency),
    customerId: asNumber(customer.contactId),
    customerName: asString(customer.name),
    lineCount: asArray(record.lines).length,
    paymentCount: asArray(record.salePayments).length,
    attachmentCount: asArray(record.saleAttachments).length,
    writeOff: asBoolean(record.writeOff),
    deleted: asBoolean(record.deleted),
    raw: record
  };
};

export let mapAccount = (value: unknown): z.infer<typeof accountSchema> => {
  let record = asRecord(value);
  return {
    code: asString(record.code),
    name: asString(record.name),
    raw: record
  };
};

export let mapAccountBalance = (value: unknown): z.infer<typeof accountBalanceSchema> => {
  let record = asRecord(value);
  return {
    code: asString(record.code),
    name: asString(record.name),
    balance: asNumber(record.balance),
    raw: record
  };
};

export let listMetadata = <T>(response: FikenListResponse<T>) => ({
  page: response.page,
  pageSize: response.pageSize,
  pageCount: response.pageCount,
  resultCount: response.resultCount,
  nextPage: response.nextPage
});

export let paginationParams = (input: { page?: number; pageSize?: number }) =>
  pickDefined({
    page: input.page ?? 0,
    pageSize: input.pageSize ?? 25
  });

export let dateRangeParams = (
  exactKey: string,
  fromKey: string,
  toKey: string,
  input: { date?: string; dateFrom?: string; dateTo?: string }
) =>
  pickDefined({
    [exactKey]: input.date,
    [fromKey]: input.dateFrom,
    [toKey]: input.dateTo
  });

export let requireInvoiceDraftLineFields = (
  line: z.infer<typeof invoiceDraftLineInputSchema>,
  index: number
) => {
  if (line.productId !== undefined) return;

  let missing = [
    ['description', line.description],
    ['unitPrice', line.unitPrice],
    ['vatType', line.vatType],
    ['incomeAccount', line.incomeAccount]
  ]
    .filter(([, value]) => value === undefined || value === '')
    .map(([key]) => key);

  if (missing.length > 0) {
    throw fikenValidationError(
      `lines[${index}] must include productId or all free-text fields: ${missing.join(', ')}.`
    );
  }
};

export let cleanBody = (value: Record<string, unknown>) => pickDefined(value);
