import { z } from 'zod';

export let backgroundOperationSchema = z.object({
  id: z.string().optional().describe('Visma background request ID.'),
  stateLocation: z.string().optional().describe('URL for polling background operation state.')
});

export let relatedRecordSchema = z.object({
  id: z.string().optional(),
  number: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional()
});

export let contactSummarySchema = z.object({
  name: z.string().optional(),
  attention: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional()
});

export let addressSummarySchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  countryId: z.string().optional()
});

export let attachmentSummarySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  revision: z.number().optional()
});

export let customerSummarySchema = z.object({
  internalId: z.number().optional(),
  customerNumber: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  customerClass: relatedRecordSchema.optional(),
  currencyId: z.string().optional(),
  vatRegistrationId: z.string().optional(),
  corporateId: z.string().optional(),
  mainContact: contactSummarySchema.optional(),
  mainAddress: addressSummarySchema.optional(),
  lastModifiedDateTime: z.string().optional(),
  createdDateTime: z.string().optional(),
  eTag: z.string().optional()
});

export let supplierSummarySchema = z.object({
  internalId: z.number().optional(),
  supplierNumber: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  supplierClass: relatedRecordSchema.optional(),
  currencyId: z.string().optional(),
  vatRegistrationId: z.string().optional(),
  corporateId: z.string().optional(),
  mainContact: contactSummarySchema.optional(),
  mainAddress: addressSummarySchema.optional(),
  lastModifiedDateTime: z.string().optional(),
  eTag: z.string().optional()
});

export let accountSummarySchema = z.object({
  accountId: z.number().optional(),
  accountCode: z.string().optional(),
  description: z.string().optional(),
  accountClass: z.string().optional(),
  accountGroupCode: z.string().optional(),
  type: z.string().optional(),
  active: z.boolean().optional(),
  currency: z.string().optional(),
  taxCategory: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  eTag: z.string().optional()
});

export let invoiceSummarySchema = z.object({
  documentType: z.string().optional(),
  referenceNumber: z.string().optional(),
  status: z.string().optional(),
  currencyId: z.string().optional(),
  amount: z.number().optional(),
  balance: z.number().optional(),
  documentDate: z.string().optional(),
  dueDate: z.string().optional(),
  customer: relatedRecordSchema.optional(),
  supplier: relatedRecordSchema.optional(),
  approvalStatus: z.string().optional(),
  financialPeriod: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  createdDateTime: z.string().optional(),
  lineCount: z.number().optional(),
  attachments: z.array(attachmentSummarySchema).optional(),
  eTag: z.string().optional()
});

export let projectSummarySchema = z.object({
  internalId: z.number().optional(),
  projectId: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  hold: z.boolean().optional(),
  customer: relatedRecordSchema.optional(),
  branch: relatedRecordSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  taskCount: z.number().optional(),
  eTag: z.string().optional()
});

export let inventoryItemSummarySchema = z.object({
  inventoryId: z.number().optional(),
  inventoryNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  itemClass: relatedRecordSchema.optional(),
  postingClass: relatedRecordSchema.optional(),
  baseUnit: z.string().optional(),
  stockItem: z.boolean().optional(),
  kitItem: z.boolean().optional(),
  defaultPrice: z.number().optional(),
  currentCost: z.number().optional(),
  lastModifiedDateTime: z.string().optional(),
  attachments: z.array(attachmentSummarySchema).optional(),
  eTag: z.string().optional()
});

export let salesOrderSummarySchema = z.object({
  orderType: z.string().optional(),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  hold: z.boolean().optional(),
  date: z.string().optional(),
  requestedOn: z.string().optional(),
  customerOrder: z.string().optional(),
  customerReferenceNumber: z.string().optional(),
  customer: relatedRecordSchema.optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  orderTotal: z.number().optional(),
  orderTotalInBaseCurrency: z.number().optional(),
  lineCount: z.number().optional(),
  shipmentCount: z.number().optional(),
  eTag: z.string().optional()
});

export let backgroundStateSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  statusCode: z.number().optional(),
  receivedUtc: z.string().optional(),
  startedUtc: z.string().optional(),
  finishedUtc: z.string().optional(),
  webhookAddress: z.string().optional(),
  errorMessage: z.string().optional(),
  reference: z.string().optional(),
  originalUri: z.string().optional(),
  hasResponseContent: z.boolean().optional(),
  hasRequestContent: z.boolean().optional(),
  contentLocation: z.string().optional(),
  responseHeaders: z.record(z.string(), z.string()).optional()
});

export let blobMetadataSchema = z.object({
  blobId: z.string().optional(),
  blobName: z.string().optional(),
  contentType: z.string().optional(),
  md5Hash: z.string().optional(),
  fileChecksum: z.string().optional(),
  size: z.number().optional(),
  countryCode: z.string().optional(),
  createdDateTimeUtc: z.string().optional()
});

type AnyRecord = Record<string, unknown>;

export let isRecord = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let toStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

let toNumberValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

let toBooleanValue = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

let getString = (record: AnyRecord, ...keys: string[]) => {
  for (let key of keys) {
    let value = toStringValue(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

let getNumber = (record: AnyRecord, ...keys: string[]) => {
  for (let key of keys) {
    let value = toNumberValue(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

let getBoolean = (record: AnyRecord, ...keys: string[]) => {
  for (let key of keys) {
    let value = toBooleanValue(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

let getRecord = (record: AnyRecord, ...keys: string[]) => {
  for (let key of keys) {
    let value = record[key];
    if (isRecord(value)) return value;
  }
  return undefined;
};

let getArray = (record: AnyRecord, ...keys: string[]) => {
  for (let key of keys) {
    let value = record[key];
    if (Array.isArray(value)) return value;
  }
  return undefined;
};

export let mapRelatedRecord = (value: unknown) => {
  if (!isRecord(value)) return undefined;

  return {
    id: getString(value, 'id', 'internalId', 'internalID', 'publicId'),
    number: getString(value, 'number', 'accountCD', 'projectID', 'inventoryNumber'),
    name: getString(value, 'name'),
    description: getString(value, 'description')
  };
};

let mapContact = (value: unknown) => {
  if (!isRecord(value)) return undefined;

  return {
    name: getString(value, 'name'),
    attention: getString(value, 'attention'),
    email: getString(value, 'email'),
    phone: getString(value, 'phone1', 'phone', 'phoneNumber')
  };
};

let mapAddress = (value: unknown) => {
  if (!isRecord(value)) return undefined;

  return {
    line1: getString(value, 'addressLine1', 'line1'),
    line2: getString(value, 'addressLine2', 'line2'),
    city: getString(value, 'city'),
    postalCode: getString(value, 'postalCode', 'zipCode'),
    countryId: getString(value, 'countryId', 'countryID', 'country')
  };
};

export let mapAttachments = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;

  return value.filter(isRecord).map(attachment => ({
    id: getString(attachment, 'id'),
    name: getString(attachment, 'name'),
    revision: getNumber(attachment, 'revision')
  }));
};

export let normalizeArray = (value: unknown) => (Array.isArray(value) ? value : []);

export let mapCustomer = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    internalId: getNumber(record, 'internalId'),
    customerNumber: getString(record, 'number'),
    name: getString(record, 'name'),
    status: getString(record, 'status'),
    customerClass: mapRelatedRecord(record.customerClass),
    currencyId: getString(record, 'currencyId'),
    vatRegistrationId: getString(record, 'vatRegistrationId'),
    corporateId: getString(record, 'corporateId'),
    mainContact: mapContact(record.mainContact),
    mainAddress: mapAddress(record.mainAddress),
    lastModifiedDateTime: getString(record, 'lastModifiedDateTime'),
    createdDateTime: getString(record, 'createdDateTime'),
    eTag: eTag ?? getString(record, 'timeStamp')
  };
};

export let mapSupplier = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    internalId: getNumber(record, 'internalId'),
    supplierNumber: getString(record, 'number'),
    name: getString(record, 'name'),
    status: getString(record, 'status'),
    supplierClass: mapRelatedRecord(record.supplierClass),
    currencyId: getString(record, 'currencyId'),
    vatRegistrationId: getString(record, 'vatRegistrationId'),
    corporateId: getString(record, 'corporateId'),
    mainContact: mapContact(record.mainContact),
    mainAddress: mapAddress(record.mainAddress),
    lastModifiedDateTime: getString(record, 'lastModifiedDateTime'),
    eTag: eTag ?? getString(record, 'timeStamp')
  };
};

export let mapAccount = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    accountId: getNumber(record, 'accountID'),
    accountCode: getString(record, 'accountCD'),
    description: getString(record, 'description'),
    accountClass: getString(record, 'accountClass'),
    accountGroupCode: getString(record, 'accountGroupCD'),
    type: getString(record, 'type'),
    active: getBoolean(record, 'active'),
    currency: getString(record, 'currency'),
    taxCategory: getString(record, 'taxCategory'),
    lastModifiedDateTime: getString(record, 'lastModifiedDateTime'),
    eTag: eTag ?? getString(record, 'timeStamp')
  };
};

export let mapCustomerInvoice = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    documentType: getString(record, 'documentType'),
    referenceNumber: getString(record, 'referenceNumber'),
    status: getString(record, 'status'),
    currencyId: getString(record, 'currencyId'),
    amount: getNumber(record, 'amount', 'amountInCurrency'),
    balance: getNumber(record, 'balance', 'balanceInCurrency'),
    documentDate: getString(record, 'documentDate', 'origInvoiceDate'),
    dueDate: getString(record, 'documentDueDate'),
    customer: mapRelatedRecord(record.customer),
    financialPeriod: getString(record, 'financialPeriod'),
    lastModifiedDateTime: getString(record, 'lastModifiedDateTime'),
    createdDateTime: getString(record, 'createdDateTime'),
    lineCount: getArray(record, 'invoiceLines')?.length,
    attachments: mapAttachments(record.attachments),
    eTag: eTag ?? getString(record, 'timeStamp')
  };
};

export let mapSupplierInvoice = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    documentType: getString(record, 'documentType'),
    referenceNumber: getString(record, 'referenceNumber'),
    status: getString(record, 'status'),
    currencyId: getString(record, 'currencyId'),
    amount: getNumber(record, 'amount'),
    balance: getNumber(record, 'balance', 'balanceInCurrency'),
    documentDate: getString(record, 'date', 'origInvoiceDate'),
    dueDate: getString(record, 'dueDate'),
    supplier: mapRelatedRecord(record.supplier),
    approvalStatus: getString(record, 'approvalStatus'),
    financialPeriod: getString(record, 'financialPeriod'),
    lastModifiedDateTime: getString(record, 'lastModifiedDateTime'),
    createdDateTime: getString(record, 'createdDateTime'),
    lineCount: getArray(record, 'invoiceLines')?.length,
    attachments: mapAttachments(record.attachments),
    eTag: eTag ?? getString(record, 'timeStamp')
  };
};

export let mapProject = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    internalId: getNumber(record, 'internalID'),
    projectId: getString(record, 'projectID'),
    description: getString(record, 'description'),
    status: getString(record, 'status'),
    hold: getBoolean(record, 'hold'),
    customer: mapRelatedRecord(record.customer),
    branch: mapRelatedRecord(record.branch),
    startDate: getString(record, 'startDate'),
    endDate: getString(record, 'endDate'),
    lastModifiedDateTime: getString(record, 'lastModifiedDateTime'),
    taskCount: getArray(record, 'tasks')?.length,
    eTag: eTag ?? getString(record, 'timeStamp')
  };
};

export let mapInventoryItem = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    inventoryId: getNumber(record, 'inventoryId'),
    inventoryNumber: getString(record, 'inventoryNumber'),
    description: getString(record, 'description'),
    status: getString(record, 'status'),
    type: getString(record, 'type'),
    itemClass: mapRelatedRecord(record.itemClass),
    postingClass: mapRelatedRecord(record.postingClass),
    baseUnit: getString(record, 'baseUnit'),
    stockItem: getBoolean(record, 'stockItem'),
    kitItem: getBoolean(record, 'kitItem'),
    defaultPrice: getNumber(record, 'defaultPrice'),
    currentCost: getNumber(record, 'currentCost'),
    lastModifiedDateTime: getString(record, 'lastModifiedDateTime'),
    attachments: mapAttachments(record.attachments),
    eTag: eTag ?? getString(record, 'timestamp')
  };
};

export let mapSalesOrder = (value: unknown, eTag?: string) => {
  let record = isRecord(value) ? value : {};

  return {
    orderType: getString(record, 'orderType'),
    orderNumber: getString(record, 'orderNo'),
    status: getString(record, 'status'),
    hold: getBoolean(record, 'hold'),
    date: getString(record, 'date'),
    requestedOn: getString(record, 'requestOn'),
    customerOrder: getString(record, 'customerOrder'),
    customerReferenceNumber: getString(record, 'customerRefNo'),
    customer: mapRelatedRecord(record.customer),
    currency: getString(record, 'currency'),
    description: getString(record, 'description'),
    orderTotal: getNumber(record, 'orderTotal'),
    orderTotalInBaseCurrency: getNumber(record, 'orderTotalInBaseCurrency'),
    lineCount: getArray(record, 'lines')?.length,
    shipmentCount: getArray(record, 'shipments')?.length,
    eTag: eTag ?? getString(record, 'timeStamp')
  };
};

export let mapBackgroundState = (value: unknown) => {
  let record = isRecord(value) ? value : {};
  let responseHeaders = getRecord(record, 'responseHeaders');

  return {
    id: getString(record, 'id'),
    status: getString(record, 'status'),
    statusCode: getNumber(record, 'statusCode'),
    receivedUtc: getString(record, 'receivedUtc'),
    startedUtc: getString(record, 'startedUtc'),
    finishedUtc: getString(record, 'finishedUtc'),
    webhookAddress: getString(record, 'webhookAddress'),
    errorMessage: getString(record, 'errorMessage'),
    reference: getString(record, 'reference'),
    originalUri: getString(record, 'originalUri'),
    hasResponseContent: getBoolean(record, 'hasResponseContent'),
    hasRequestContent: getBoolean(record, 'hasRequestContent'),
    contentLocation: getString(record, 'contentLocation'),
    responseHeaders: responseHeaders
      ? Object.fromEntries(
          Object.entries(responseHeaders)
            .map(([key, value]) => [key, toStringValue(value)])
            .filter((entry): entry is [string, string] => entry[1] !== undefined)
        )
      : undefined
  };
};

export let mapBlobMetadata = (value: unknown) => {
  let record = isRecord(value) ? value : {};

  return {
    blobId: getString(record, 'blobId'),
    blobName: getString(record, 'blobName'),
    contentType: getString(record, 'contentType'),
    md5Hash: getString(record, 'mD5Hash'),
    fileChecksum: getString(record, 'fileChecksum'),
    size: getNumber(record, 'size'),
    countryCode: getString(record, 'countryCode'),
    createdDateTimeUtc: getString(record, 'createdDateTimeUtc')
  };
};
