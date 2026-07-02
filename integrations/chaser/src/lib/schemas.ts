import { z } from 'zod';

// --- Common ---

export let addressSchema = z.object({
  addressType: z
    .enum(['POBOX', 'Unknown', 'Delivery', 'Billing'])
    .default('POBOX')
    .describe('Type of address'),
  country: z.string().nullable().optional().describe('Country'),
  region: z.string().nullable().optional().describe('Region or state'),
  city: z.string().nullable().optional().describe('City'),
  postalCode: z.string().nullable().optional().describe('Postal/ZIP code'),
  addressLine1: z.string().nullable().optional().describe('Address line 1'),
  addressLine2: z.string().nullable().optional().describe('Address line 2'),
  addressLine3: z.string().nullable().optional().describe('Address line 3'),
  addressLine4: z.string().nullable().optional().describe('Address line 4')
});

export let groupSchema = z.object({
  name: z.string().describe('Group name'),
  groupId: z.string().nullable().optional().describe('Group ID'),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE').describe('Group status')
});

export let paymentSchema = z.object({
  amount: z.number().describe('Payment amount'),
  date: z.string().describe('Payment date (ISO 8601)')
});

// --- Customer ---

export let customerInputSchema = z.object({
  externalId: z.string().describe('Unique ID from your source system'),
  companyName: z.string().describe('Company/customer name'),
  contactFirstName: z.string().nullable().optional().describe('Primary contact first name'),
  contactLastName: z.string().nullable().optional().describe('Primary contact last name'),
  contactEmailAddress: z.string().nullable().optional().describe('Primary contact email'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  mobileNumber: z.string().nullable().optional().describe('Mobile number'),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional().describe('Customer status'),
  groups: z.array(groupSchema).optional().describe('Groups/tags assigned to the customer'),
  addresses: z.array(addressSchema).optional().describe('Customer addresses')
});

export let customerOutputSchema = z.object({
  customerId: z.string().describe('Internal Chaser customer ID'),
  externalId: z.string().describe('External system ID'),
  companyName: z.string().describe('Company/customer name'),
  contactFirstName: z.string().nullable().optional().describe('Primary contact first name'),
  contactLastName: z.string().nullable().optional().describe('Primary contact last name'),
  contactEmailAddress: z.string().nullable().optional().describe('Primary contact email'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  mobileNumber: z.string().nullable().optional().describe('Mobile number'),
  status: z.string().optional().describe('Customer status'),
  groups: z.array(groupSchema).optional().describe('Groups/tags'),
  addresses: z.array(addressSchema).optional().describe('Addresses'),
  paymentPortalLink: z.string().nullable().optional().describe('Payment portal link'),
  payerRating: z.number().nullable().optional().describe('Payer rating score'),
  payerRatingUpdatedAt: z
    .string()
    .nullable()
    .optional()
    .describe('When payer rating was last updated'),
  payerRatingNumberInvoicesConsidered: z
    .number()
    .nullable()
    .optional()
    .describe('Number of invoices considered for payer rating'),
  averageDaysToPay: z
    .number()
    .nullable()
    .optional()
    .describe('Average days customer takes to pay')
});

// --- Contact Person ---

export let contactPersonInputSchema = z.object({
  externalId: z.string().describe('Unique external ID for the contact person'),
  contactFirstName: z.string().nullable().optional().describe('First name'),
  contactLastName: z.string().nullable().optional().describe('Last name'),
  contactEmailAddress: z.string().nullable().optional().describe('Email address'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  mobileNumber: z.string().nullable().optional().describe('Mobile number'),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional().describe('Contact person status')
});

export let contactPersonOutputSchema = z.object({
  externalId: z.string().describe('External ID'),
  contactFirstName: z.string().nullable().optional().describe('First name'),
  contactLastName: z.string().nullable().optional().describe('Last name'),
  contactEmailAddress: z.string().nullable().optional().describe('Email address'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  mobileNumber: z.string().nullable().optional().describe('Mobile number'),
  status: z.string().optional().describe('Status')
});

// --- Invoice ---

export let invoiceStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'AUTHORISED',
  'PAID',
  'VOIDED',
  'DELETED'
]);

export let invoiceInputSchema = z.object({
  invoiceId: z.string().describe('Unique external invoice identifier'),
  invoiceNumber: z.string().describe('Customer-facing invoice number'),
  status: invoiceStatusEnum.describe('Invoice status'),
  currencyCode: z.string().describe('3-letter currency code (e.g. USD, GBP, AUD)'),
  amountDue: z.number().describe('Amount still due'),
  amountPaid: z.number().describe('Amount already paid'),
  total: z.number().describe('Total invoice amount'),
  subTotal: z.number().nullable().optional().describe('Subtotal before tax'),
  date: z.string().describe('Invoice issued date (ISO 8601)'),
  dueDate: z.string().describe('Invoice due date (ISO 8601)'),
  fullyPaidDate: z
    .string()
    .nullable()
    .optional()
    .describe('Date invoice was fully paid (ISO 8601)'),
  customerExternalId: z.string().describe('External ID of the associated customer')
});

export let invoiceOutputSchema = z.object({
  invoiceInternalId: z.string().describe('Internal Chaser invoice ID'),
  invoiceId: z.string().describe('External invoice identifier'),
  invoiceNumber: z.string().describe('Customer-facing invoice number'),
  status: z.string().describe('Invoice status'),
  currencyCode: z.string().describe('Currency code'),
  amountDue: z.number().describe('Amount due'),
  amountPaid: z.number().describe('Amount paid'),
  total: z.number().describe('Total amount'),
  subTotal: z.number().nullable().optional().describe('Subtotal'),
  date: z.string().describe('Issue date'),
  dueDate: z.string().describe('Due date'),
  fullyPaidDate: z.string().nullable().optional().describe('Fully paid date'),
  customerExternalId: z.string().describe('Customer external ID'),
  customerName: z.string().nullable().optional().describe('Customer name'),
  payments: z.array(paymentSchema).optional().describe('Payment history'),
  invoicePdfLink: z.string().nullable().optional().describe('URL to uploaded PDF'),
  invoicePdfLinkUpdatedAt: z
    .string()
    .nullable()
    .optional()
    .describe('When PDF was last updated')
});

// --- Credit Note ---

export let creditNoteInputSchema = z.object({
  creditNoteId: z.string().describe('Unique external credit note identifier'),
  creditNoteNumber: z.string().describe('Credit note number'),
  remainingCredit: z.number().describe('Remaining credit amount'),
  date: z.string().describe('Credit note date (ISO 8601)'),
  status: invoiceStatusEnum.describe('Credit note status'),
  total: z.number().describe('Total credit note amount'),
  currencyCode: z.string().describe('3-letter currency code'),
  customerExternalId: z.string().describe('External ID of the associated customer')
});

export let creditNoteOutputSchema = z.object({
  creditNoteInternalId: z.string().describe('Internal Chaser credit note ID'),
  creditNoteId: z.string().describe('External credit note identifier'),
  creditNoteNumber: z.string().describe('Credit note number'),
  remainingCredit: z.number().describe('Remaining credit'),
  date: z.string().describe('Date'),
  status: z.string().describe('Status'),
  total: z.number().describe('Total amount'),
  currencyCode: z.string().describe('Currency code'),
  customerExternalId: z.string().describe('Customer external ID'),
  customerName: z.string().nullable().optional().describe('Customer name')
});

// --- Overpayment ---

export let overpaymentInputSchema = z.object({
  overpaymentId: z.string().describe('Unique external overpayment identifier'),
  remainingCredit: z.number().describe('Remaining credit amount'),
  date: z.string().describe('Overpayment date (ISO 8601)'),
  status: invoiceStatusEnum.describe('Overpayment status'),
  total: z.number().describe('Total overpayment amount'),
  currencyCode: z.string().describe('3-letter currency code'),
  customerExternalId: z.string().describe('External ID of the associated customer')
});

export let overpaymentOutputSchema = z.object({
  overpaymentInternalId: z.string().describe('Internal Chaser overpayment ID'),
  overpaymentId: z.string().describe('External overpayment identifier'),
  remainingCredit: z.number().describe('Remaining credit'),
  date: z.string().describe('Date'),
  status: z.string().describe('Status'),
  total: z.number().describe('Total amount'),
  currencyCode: z.string().describe('Currency code'),
  customerExternalId: z.string().describe('Customer external ID'),
  customerName: z.string().nullable().optional().describe('Customer name')
});

// --- Organisation ---

export let organisationOutputSchema = z.object({
  organisationId: z.string().describe('Organisation ID'),
  organisationInternalId: z.string().describe('Internal ID'),
  name: z.string().describe('Organisation name'),
  legalName: z.string().describe('Legal name'),
  baseCurrency: z.string().describe('Base currency code'),
  countryCode: z.string().describe('Country code'),
  timezone: z.string().describe('Timezone'),
  lastSyncDate: z.string().nullable().optional().describe('Last sync date (ISO 8601)')
});

export let syncTaskEnum = z.enum([
  'CALCULATE_NEXT_CHASES',
  'UPDATE_INVOICE_INSTALMENTS',
  'CALCULATE_CONTACT_BALANCES',
  'VERIFY_CONTACT_CREDIT_LIMIT',
  'CALCULATE_TASK_REMINDERS',
  'CALCULATE_TOTAL_REVENUE'
]);
