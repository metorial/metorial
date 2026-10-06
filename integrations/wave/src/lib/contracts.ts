import { z } from 'zod';

const id = z.string().min(1);
const optional = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform(value => value ?? undefined);
const text = optional(z.string());
export const decimal = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?$/)
  .max(200);
const location = z.object({ code: id, name: z.string() });
const currency = z.object({ code: id, symbol: z.string(), name: z.string() });
const address = z.object({
  addressLine1: text,
  addressLine2: text,
  city: text,
  postalCode: text,
  province: optional(location),
  country: optional(location)
});
const classification = z.object({ name: z.string(), value: id });
const timestamps = { createdAt: id, modifiedAt: id };
const businessRef = z.object({ id });
export const business = z.object({
  id,
  name: z.string(),
  isPersonal: z.boolean(),
  organizationalType: text,
  isClassicAccounting: z.boolean(),
  isClassicInvoicing: z.boolean(),
  emailSendEnabled: z.boolean(),
  type: optional(classification),
  subtype: optional(classification),
  currency,
  address: optional(address),
  phone: text,
  fax: text,
  mobile: text,
  tollFree: text,
  website: text,
  ...timestamps
});
const contact = z.object({
  id,
  business: businessRef,
  name: z.string(),
  firstName: text,
  lastName: text,
  displayId: text,
  email: text,
  mobile: text,
  phone: text,
  fax: text,
  tollFree: text,
  website: text,
  internalNotes: text,
  currency: optional(currency),
  address: optional(address),
  shippingDetails: optional(
    z.object({ name: text, phone: text, instructions: text, address: optional(address) })
  ),
  ...timestamps
});
export const customer = contact;
export const vendor = contact;
export const account = z.object({
  id,
  business: businessRef,
  name: z.string(),
  description: text,
  displayId: text,
  type: classification.extend({ normalBalanceType: id }),
  subtype: classification.extend({ type: classification }),
  currency,
  isArchived: z.boolean(),
  sequence: z.number().int().nonnegative(),
  balance: optional(decimal),
  balanceInBusinessCurrency: optional(decimal)
});
export const product = z.object({
  id,
  business: businessRef,
  name: z.string(),
  description: text,
  unitPrice: decimal,
  isSold: z.boolean(),
  isBought: z.boolean(),
  isArchived: z.boolean(),
  incomeAccount: optional(z.object({ id, name: z.string() })),
  expenseAccount: optional(z.object({ id, name: z.string() })),
  defaultSalesTaxes: z.array(z.object({ id, name: z.string() })),
  ...timestamps
});
export const salesTax = z.object({
  id,
  business: businessRef,
  name: z.string(),
  abbreviation: z.string(),
  description: text,
  taxNumber: text,
  rate: decimal,
  isCompound: z.boolean(),
  isRecoverable: z.boolean(),
  isArchived: z.boolean(),
  rates: z.array(z.object({ effective: id, rate: decimal })),
  ...timestamps
});
const money = z.object({
  value: decimal,
  currency: z.object({ code: id, symbol: z.string() })
});
export const invoice = z.object({
  id,
  business: businessRef,
  status: id,
  invoiceNumber: id,
  invoiceDate: id,
  dueDate: id,
  title: z.string(),
  subhead: text,
  poNumber: text,
  memo: text,
  footer: text,
  currency,
  amountDue: money,
  amountPaid: money,
  taxTotal: money,
  total: money,
  exchangeRate: decimal,
  customer: z.object({ id, name: z.string(), email: text }),
  pdfUrl: id,
  viewUrl: id,
  items: optional(
    z.array(
      z.object({
        description: text,
        quantity: decimal,
        unitPrice: decimal,
        total: money,
        product: z.object({ id, name: z.string() }),
        taxes: z.array(
          z.object({
            amount: optional(z.object({ value: decimal })),
            salesTax: z.object({ id, name: z.string() })
          })
        )
      })
    )
  ),
  disableCreditCardPayments: z.boolean(),
  disableBankPayments: z.boolean(),
  lastSentAt: text,
  lastSentVia: text,
  lastViewedAt: text,
  ...timestamps
});
export const user = z.object({
  id,
  firstName: text,
  lastName: text,
  defaultEmail: text,
  ...timestamps
});
export const transaction = z.object({ id });
export const resources = { business, customer, account, product, salesTax, invoice, vendor };
export type ResourceKind = keyof typeof resources;
export type Customer = z.output<typeof customer>;
export type Account = z.output<typeof account>;
export type Product = z.output<typeof product>;
export type SalesTax = z.output<typeof salesTax>;
export type Invoice = z.output<typeof invoice>;
