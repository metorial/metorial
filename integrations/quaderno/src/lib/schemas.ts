import { z } from 'zod';
import {
  amountValue,
  countryInput,
  currencyInput,
  date,
  dateInput,
  decimal,
  decimalInput,
  idInput,
  integerValue,
  invalid,
  isoUnix,
  numericId,
  object,
  type Row,
  records,
  reject,
  resource,
  resourceId,
  safeInteger,
  stringValue,
  textInput
} from './validation';
export const taxClass = z.enum([
  'consulting',
  'eservice',
  'ebook',
  'saas',
  'standard',
  'reduced'
]);
const optionalText = z.string().optional();
export const contactInput = {
  kind: z.enum(['person', 'company']).optional(),
  firstName: textInput.optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone1: z.string().optional(),
  taxId: z.string().optional(),
  contactName: z.string().optional().describe('Contact person for a company.'),
  streetLine1: z.string().optional(),
  streetLine2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  region: z.string().optional(),
  country: countryInput.optional(),
  currency: currencyInput
    .optional()
    .describe('Legacy contact preference; not supported in the current API.'),
  language: z
    .string()
    .regex(/^[a-z]{2}$/i)
    .optional(),
  notes: z.string().optional()
};
export const contactOutput = {
  contactId: z.string().optional(),
  kind: optionalText,
  firstName: optionalText,
  lastName: optionalText,
  fullName: optionalText,
  email: optionalText,
  phone1: optionalText,
  phone2: optionalText,
  taxId: optionalText,
  contactName: optionalText,
  streetLine1: optionalText,
  streetLine2: optionalText,
  city: optionalText,
  postalCode: optionalText,
  region: optionalText,
  country: optionalText,
  currency: optionalText,
  language: optionalText,
  notes: optionalText,
  url: optionalText,
  permalink: optionalText
};
export function fields(input: Row, map: Record<string, string>) {
  const output: Row = {};
  for (const [key, target] of Object.entries(map))
    if (input[key] !== undefined) output[target] = input[key];
  return output;
}
export const contactMap = {
  kind: 'kind',
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone1: 'phone_1',
  taxId: 'tax_id',
  contactName: 'contact_person',
  streetLine1: 'street_line_1',
  streetLine2: 'street_line_2',
  city: 'city',
  postalCode: 'postal_code',
  region: 'region',
  country: 'country',
  language: 'language',
  notes: 'notes'
};
export function mapContactInput(input: Row, create = false) {
  reject(
    input,
    ['currency'],
    'The current contact API does not accept a currency preference. Set currency on documents or products instead.'
  );
  if (create && !input.firstName)
    throw invalid(
      'firstName is required by the current contact API. For a company, supply its display name.'
    );
  return fields(input, contactMap);
}
export function mapContact(value: unknown) {
  const record = resource(value);
  const output: Row = { contactId: resourceId(record.id) };
  for (const [key, source] of Object.entries({
    ...contactMap,
    fullName: 'full_name',
    phone2: 'phone_2',
    currency: 'currency',
    url: 'url',
    permalink: 'permalink'
  }))
    output[key] = stringValue(record[source]);
  if (!output.fullName)
    output.fullName =
      [record.first_name, record.last_name]
        .filter(v => typeof v === 'string' && v)
        .join(' ') || undefined;
  return output;
}
export const productInput = {
  code: textInput.optional(),
  name: textInput.optional(),
  unitCost: decimalInput.optional(),
  currency: currencyInput.optional(),
  taxClass: taxClass.optional(),
  description: z.string().optional(),
  kind: z.enum(['one_off', 'subscription']).optional(),
  productType: z.enum(['good', 'service']).optional(),
  taxType: z.enum(['included', 'excluded']).optional(),
  taxBasedOn: z.enum(['customer_country', 'country']).optional(),
  country: countryInput.optional(),
  stripePlanId: textInput.optional()
};
export const productOutput = {
  productId: z.string().optional(),
  code: optionalText,
  name: optionalText,
  unitCost: optionalText,
  currency: optionalText,
  taxClass: optionalText,
  kind: optionalText,
  productType: optionalText,
  taxType: optionalText,
  taxBasedOn: optionalText,
  description: optionalText
};
const productMap = {
  code: 'code',
  name: 'name',
  unitCost: 'unit_cost',
  currency: 'currency',
  taxClass: 'tax_class',
  kind: 'kind',
  productType: 'product_type',
  taxType: 'tax_type',
  taxBasedOn: 'tax_based_on',
  country: 'country',
  description: 'description',
  stripePlanId: 'stripe_plan_id'
};
export function mapProductInput(input: Row, create = false) {
  if (create && (!input.code || !input.name || input.unitCost === undefined))
    throw invalid('Create a product with code, name and unitCost.');
  if (input.unitCost !== undefined && !decimalInput.safeParse(input.unitCost).success)
    throw invalid('Use a decimal unitCost in currency major units.');
  if (create && input.taxBasedOn === 'country' && !input.country)
    throw invalid('country is required when taxBasedOn is country.');
  return fields(input, productMap);
}
export function mapProduct(value: unknown) {
  const record = resource(value);
  const output: Row = { productId: resourceId(record.id) };
  for (const [key, source] of Object.entries(productMap))
    output[key] =
      key === 'unitCost' ? amountValue(record[source]) : stringValue(record[source]);
  return output;
}
export const lineItemInputSchema = z.object({
  description: textInput
    .optional()
    .describe('Required description for the current document API.'),
  quantity: z.number().finite().optional(),
  unitPrice: decimalInput.optional(),
  totalAmount: decimalInput
    .optional()
    .describe(
      'Alternative total after taxes and discounts, in currency major units. Use either unitPrice or totalAmount.'
    ),
  discount: decimalInput
    .optional()
    .describe('Legacy discount percentage; maps to discount_rate.'),
  taxCode: taxClass.optional(),
  productCode: textInput.optional(),
  tax1Rate: z.number().finite().min(0).max(100).optional(),
  tax1Name: z.string().optional(),
  tax1Country: countryInput.optional(),
  tax1Region: z.string().optional(),
  tax2Rate: z.number().finite().min(0).max(100).optional(),
  tax2Name: z.string().optional(),
  tax2Country: countryInput.optional(),
  tax2Region: z.string().optional()
});
export function mapLineItemInput(input: z.infer<typeof lineItemInputSchema>): Row {
  if (!input.description) throw invalid('Each document line requires description.');
  if ((input.unitPrice === undefined) === (input.totalAmount === undefined))
    throw invalid(
      'Each document line requires exactly one of unitPrice or totalAmount, in currency major units.'
    );
  const mapped = fields(input, {
    description: 'description',
    quantity: 'quantity',
    taxCode: 'tax_1_transaction_type',
    productCode: 'product_code',
    tax1Rate: 'tax_1_rate',
    tax1Name: 'tax_1_name',
    tax1Country: 'tax_1_country',
    tax1Region: 'tax_1_region',
    tax2Rate: 'tax_2_rate',
    tax2Name: 'tax_2_name',
    tax2Country: 'tax_2_country',
    tax2Region: 'tax_2_region'
  });
  if (input.unitPrice !== undefined) mapped.unit_price = decimal(input.unitPrice);
  if (input.totalAmount !== undefined) mapped.total_amount = decimal(input.totalAmount);
  if (input.discount !== undefined) {
    const discount = decimal(input.discount);
    if (discount < 0 || discount > 100)
      throw invalid('Discount must be between 0 and 100 percent.');
    mapped.discount_rate = discount;
  }
  return mapped;
}
export const lineItemOutputSchema = z.object({
  lineItemId: optionalText,
  description: optionalText,
  quantity: optionalText,
  unitPrice: optionalText,
  discount: optionalText,
  totalAmount: optionalText,
  tax1Rate: z.number().finite().optional(),
  tax1Name: optionalText,
  tax2Rate: z.number().finite().optional(),
  tax2Name: optionalText,
  subtotalCents: safeInteger.optional(),
  discountCents: safeInteger.optional()
});
export const taxOutputSchema = z.object({
  label: optionalText,
  rate: z.number().finite().optional(),
  country: optionalText,
  region: optionalText,
  amountCents: safeInteger.optional()
});
export const paymentOutput = {
  paymentId: z.string().optional(),
  amount: optionalText,
  date: optionalText,
  paymentMethod: optionalText,
  processor: optionalText,
  processorId: optionalText
};
export function mapPayment(value: unknown) {
  const r = resource(value);
  return {
    paymentId: resourceId(r.id),
    amount: amountValue(r.amount),
    date: stringValue(r.date),
    paymentMethod: stringValue(r.payment_method),
    processor: stringValue(r.processor),
    processorId: stringValue(r.processor_id)
  };
}
export const documentOutputSchema = z.object({
  documentId: z.string().optional(),
  number: optionalText,
  issueDate: optionalText,
  dueDate: optionalText,
  currency: optionalText,
  subject: optionalText,
  notes: optionalText,
  poNumber: optionalText,
  state: optionalText,
  tag: optionalText,
  contactId: optionalText,
  contactName: optionalText,
  subtotal: optionalText.describe(
    'Legacy major-unit subtotal if supplied by the provider; use subtotalCents for the current API.'
  ),
  taxes: optionalText.describe(
    'Legacy major-unit tax amount if supplied by the provider; current tax details are in taxBreakdown.'
  ),
  total: optionalText.describe(
    'Legacy major-unit total if supplied by the provider; use totalCents for the current API.'
  ),
  items: z.array(lineItemOutputSchema).optional(),
  url: optionalText,
  permalink: optionalText,
  subtotalCents: safeInteger.optional(),
  discountCents: safeInteger.optional(),
  totalCents: safeInteger.optional(),
  tagList: z.array(z.string()).optional(),
  taxBreakdown: z.array(taxOutputSchema).optional(),
  payments: z.array(z.object(paymentOutput)).optional()
});
export function mapDocumentOutput(value: unknown): Row {
  const doc = resource(value);
  const contact =
    doc.contact === undefined || doc.contact === null
      ? undefined
      : typeof doc.contact === 'object'
        ? object(doc.contact)
        : { id: doc.contact };
  let tagList: string[] | undefined;
  if (doc.tag_list !== undefined && doc.tag_list !== null) {
    if (typeof doc.tag_list === 'string') tagList = tags(doc.tag_list);
    else if (!Array.isArray(doc.tag_list) || doc.tag_list.some(t => typeof t !== 'string'))
      throw invalid('Quaderno returned invalid document tags.');
    if (Array.isArray(doc.tag_list)) tagList = doc.tag_list;
  }
  return {
    documentId: resourceId(doc.id),
    number: doc.number === undefined ? undefined : String(doc.number),
    issueDate: stringValue(doc.issue_date),
    dueDate: stringValue(doc.due_date),
    currency: stringValue(doc.currency),
    subject: stringValue(doc.subject),
    notes: stringValue(doc.notes),
    poNumber: stringValue(doc.po_number),
    state: stringValue(doc.state),
    tag: stringValue(doc.tag) ?? tagList?.join(','),
    tagList,
    contactId: contact?.id === undefined ? undefined : resourceId(contact.id),
    contactName: contact
      ? (stringValue(contact.full_name) ?? stringValue(contact.first_name))
      : undefined,
    subtotal: amountValue(doc.subtotal),
    taxes: Array.isArray(doc.taxes) ? undefined : amountValue(doc.taxes),
    total: amountValue(doc.total),
    subtotalCents: integerValue(doc.subtotal_cents),
    discountCents: integerValue(doc.discount_cents),
    totalCents: integerValue(doc.total_cents),
    url: stringValue(doc.url),
    permalink: stringValue(doc.permalink),
    items:
      doc.items === undefined
        ? undefined
        : records(doc.items).map(item => ({
            lineItemId: item.id === undefined ? undefined : resourceId(item.id),
            description: stringValue(item.description),
            quantity: amountValue(item.quantity),
            unitPrice: amountValue(item.unit_price),
            discount: amountValue(item.discount_rate ?? item.discount),
            totalAmount: amountValue(item.total_amount),
            tax1Rate: item.tax_1_rate === null ? undefined : item.tax_1_rate,
            tax1Name: stringValue(item.tax_1_name),
            tax2Rate: item.tax_2_rate === null ? undefined : item.tax_2_rate,
            tax2Name: stringValue(item.tax_2_name),
            subtotalCents: integerValue(item.subtotal_cents),
            discountCents: integerValue(item.discount_cents)
          })),
    taxBreakdown: Array.isArray(doc.taxes)
      ? records(doc.taxes).map(tax => ({
          label: stringValue(tax.label),
          rate: tax.rate ?? undefined,
          country: stringValue(tax.country),
          region: stringValue(tax.region),
          amountCents: integerValue(tax.amount_cents)
        }))
      : undefined,
    payments: doc.payments === undefined ? undefined : records(doc.payments).map(mapPayment)
  };
}
export const documentInput = {
  contactId: idInput.optional(),
  currency: currencyInput.optional(),
  issueDate: dateInput.optional(),
  dueDate: dateInput.optional(),
  subject: z.string().optional(),
  notes: z.string().optional(),
  poNumber: z.string().optional(),
  tag: z.string().optional().describe('Comma-separated tags; each tag at most 40 characters.'),
  items: z.array(lineItemInputSchema).min(1).max(200),
  paymentDetails: z.string().optional(),
  customMetadata: z.record(z.string().max(40), z.string().max(500)).optional()
};
export function tags(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw invalid('Tags must be a comma-separated string.');
  const result = value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  if (result.some(t => t.length > 40))
    throw invalid('Each tag must be at most 40 characters.');
  return result;
}
export function metadata(value: unknown) {
  if (value === undefined) return undefined;
  const result = object(value);
  if (Object.keys(result).length > 20) throw invalid('Provide at most 20 metadata entries.');
  return result;
}
export function mapDocumentInput(
  input: Row,
  kind: 'invoices' | 'credits' | 'expenses' | 'proformas' | 'recurring'
): Row {
  if (!input.contactId) throw invalid('contactId is required by the current document API.');
  if (kind === 'expenses')
    reject(input, ['dueDate'], 'The current expense API does not accept dueDate.');
  if (kind === 'proformas')
    reject(
      input,
      ['issueDate', 'dueDate'],
      'The current estimate API sets issueDate automatically. Use validUntil or dueDays for estimate timing.'
    );
  const mapped = fields(input, {
    currency: 'currency',
    issueDate: 'issue_date',
    dueDate: 'due_date',
    subject: 'subject',
    notes: 'notes',
    poNumber: 'po_number',
    paymentDetails: 'payment_details'
  });
  for (const key of ['issueDate', 'dueDate'])
    if (input[key] !== undefined) date(String(input[key]));
  if (input.issueDate && input.dueDate && String(input.issueDate) > String(input.dueDate))
    throw invalid('dueDate must not precede issueDate.');
  const parsed = z.array(lineItemInputSchema).safeParse(input.items);
  if (!parsed.success) throw invalid('Provide valid document line items.');
  mapped.contact = { id: numericId(String(input.contactId)) };
  mapped.items = parsed.data.map(mapLineItemInput);
  if (input.tag !== undefined) mapped.tag_list = tags(input.tag);
  if (input.customMetadata !== undefined)
    mapped.custom_metadata = metadata(input.customMetadata);
  return mapped;
}
export const recurringOutput = {
  recurringId: z.string().optional(),
  contactId: optionalText,
  contactName: optionalText,
  currency: optionalText,
  startDate: optionalText,
  frequency: optionalText,
  period: safeInteger.optional(),
  endingCount: safeInteger.optional(),
  endingDate: optionalText,
  documentType: optionalText,
  state: optionalText,
  recurringPeriod: optionalText,
  recurringFrequency: safeInteger.optional(),
  subject: optionalText,
  notes: optionalText,
  totalCents: safeInteger.optional()
};
export function mapRecurring(value: unknown) {
  const r = resource(value);
  const contact =
    r.contact === undefined
      ? undefined
      : typeof r.contact === 'object'
        ? object(r.contact)
        : { id: r.contact };
  return {
    recurringId: resourceId(r.id),
    contactId: contact?.id === undefined ? undefined : resourceId(contact.id),
    contactName: contact
      ? (stringValue(contact.full_name) ?? stringValue(contact.first_name))
      : undefined,
    currency: stringValue(r.currency),
    startDate: stringValue(r.start_date),
    frequency: stringValue(r.frequency),
    period: integerValue(r.period),
    endingCount: integerValue(r.ending_count),
    endingDate: stringValue(r.end_date ?? r.ending_date),
    documentType: stringValue(r.document_type),
    state: stringValue(r.state),
    recurringPeriod: stringValue(r.recurring_period),
    recurringFrequency: integerValue(r.recurring_frequency),
    subject: stringValue(r.subject),
    notes: stringValue(r.notes),
    totalCents: integerValue(r.total_cents)
  };
}
export const jurisdictionOutput = {
  jurisdictionId: z.string().optional(),
  country: optionalText,
  region: optionalText,
  name: optionalText,
  taxAccountNumber: optionalText,
  status: optionalText
};
export function mapJurisdiction(value: unknown) {
  const r = resource(value);
  return {
    jurisdictionId: resourceId(r.id),
    country: stringValue(r.country),
    region: stringValue(r.region),
    name: stringValue(r.name),
    taxAccountNumber: stringValue(r.tax_account_number),
    status: stringValue(r.status)
  };
}
export const checkoutOutput = {
  customerTaxId: optionalText,
  customerCountry: optionalText,
  billingAddressCollection: z.boolean().optional(),
  sessionId: z.string().optional(),
  url: optionalText,
  status: optionalText,
  successUrl: optionalText,
  cancelUrl: optionalText,
  currency: optionalText,
  customerEmail: optionalText,
  createdAt: optionalText,
  createdAtUnix: safeInteger.optional()
};
export function mapCheckout(value: unknown) {
  const r = resource(value);
  const customer =
    r.customer === undefined || r.customer === null ? undefined : object(r.customer);
  const created = integerValue(
    typeof r.created_at === 'string' && /^\d{1,13}$/.test(r.created_at)
      ? Number(r.created_at)
      : r.created_at
  );
  return {
    sessionId: resourceId(r.id),
    url: stringValue(r.permalink ?? r.url),
    status: stringValue(r.status),
    successUrl: stringValue(r.success_url),
    cancelUrl: stringValue(r.cancel_url),
    currency: stringValue(r.currency),
    customerEmail: customer ? stringValue(customer.email) : stringValue(r.customer_email),
    customerTaxId: customer ? stringValue(customer.tax_id) : stringValue(r.customer_tax_id),
    customerCountry: customer
      ? stringValue(customer.billing_country)
      : stringValue(r.customer_country),
    billingAddressCollection:
      r.billing_details_collection === undefined
        ? undefined
        : r.billing_details_collection === 'required',
    createdAt: created === undefined ? undefined : isoUnix(created),
    createdAtUnix: created
  };
}
