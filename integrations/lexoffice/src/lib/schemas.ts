import { z } from 'zod';
import { safeDecimal } from './validation';

const text = z.string();
const id = z.string().min(1);
export const count = z.number().int().nonnegative().refine(Number.isSafeInteger);
export const money = z.number().refine(value => safeDecimal(value, 2));
export const precise = z.number().refine(value => safeDecimal(value, 4));
export const actionSchema = z.object({
  id,
  resourceUri: text,
  createdDate: text,
  updatedDate: text,
  version: count
});
const contactPerson = z.object({
  salutation: text.optional(),
  firstName: text.optional(),
  lastName: text.optional(),
  primary: z.boolean().optional(),
  emailAddress: text.optional(),
  phoneNumber: text.optional()
});
export const addressSchema = z.object({
  contactId: text.optional(),
  name: text.optional(),
  supplement: text.optional(),
  street: text.optional(),
  zip: text.optional(),
  city: text.optional(),
  countryCode: text.optional()
});
const roles = z.object({
  customer: z.object({ number: count.optional() }).optional(),
  vendor: z.object({ number: count.optional() }).optional()
});
export const xRechnungSchema = z.object({
  buyerReference: text.optional().describe('Customer Leitweg-ID for XRechnung invoices'),
  vendorNumberAtCustomer: text.optional().describe('Your vendor number at this customer')
});
export const contactSchema = z.object({
  id,
  organizationId: text.optional(),
  version: count,
  roles: roles.optional(),
  company: z
    .object({
      name: text.optional(),
      taxNumber: text.optional(),
      vatRegistrationId: text.optional(),
      allowTaxFreeInvoices: z.boolean().optional(),
      contactPersons: z.array(contactPerson).optional()
    })
    .optional(),
  person: z
    .object({
      salutation: text.optional(),
      firstName: text.optional(),
      lastName: text.optional()
    })
    .optional(),
  archived: z.boolean().optional(),
  note: text.optional(),
  xRechnung: xRechnungSchema.optional(),
  addresses: z
    .object({
      billing: z.array(addressSchema).optional(),
      shipping: z.array(addressSchema).optional()
    })
    .optional(),
  emailAddresses: z
    .object({
      business: z.array(text).optional(),
      office: z.array(text).optional(),
      private: z.array(text).optional(),
      other: z.array(text).optional()
    })
    .optional(),
  phoneNumbers: z
    .object({
      business: z.array(text).optional(),
      office: z.array(text).optional(),
      mobile: z.array(text).optional(),
      private: z.array(text).optional(),
      fax: z.array(text).optional(),
      other: z.array(text).optional()
    })
    .optional(),
  xpiEditUrl: text.optional()
});
export const articleSchema = z.object({
  id,
  organizationId: text.optional(),
  resourceUri: text.optional(),
  title: text,
  description: text.optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  articleNumber: text.optional(),
  gtin: text.optional(),
  note: text.optional(),
  unitName: text,
  price: z.object({
    netPrice: precise.optional(),
    grossPrice: precise.optional(),
    taxRate: z.number(),
    leadingPrice: z.enum(['NET', 'GROSS'])
  }),
  version: count,
  archived: z.boolean().optional(),
  createdDate: text.optional(),
  updatedDate: text.optional()
});
const unitPrice = z.object({
  currency: text.optional(),
  netAmount: precise.optional(),
  grossAmount: precise.optional(),
  taxRatePercentage: z.number().optional()
});
const lineItem = z.object({
  id: text.optional(),
  type: text.optional(),
  name: text.optional(),
  description: text.optional(),
  quantity: precise.optional(),
  unitName: text.optional(),
  unitPrice: unitPrice.optional(),
  discountPercentage: money.optional(),
  lineItemAmount: money.optional(),
  alternative: z.boolean().optional(),
  optional: z.boolean().optional()
});
export const salesSchema = z.object({
  id,
  organizationId: text.optional(),
  voucherNumber: text.optional(),
  voucherStatus: text.optional(),
  voucherDate: text.optional(),
  expirationDate: text.optional(),
  dueDate: text.optional(),
  address: addressSchema.optional(),
  lineItems: z.array(lineItem).optional(),
  totalPrice: z
    .object({
      currency: text.optional(),
      totalNetAmount: money.optional(),
      totalGrossAmount: money.optional(),
      totalTaxAmount: money.optional()
    })
    .optional(),
  taxConditions: z
    .object({
      taxType: text.optional(),
      taxSubType: text.optional(),
      taxTypeNote: text.optional()
    })
    .optional(),
  taxAmounts: z
    .array(
      z.object({
        taxRatePercentage: z.number().optional(),
        taxAmount: money.optional(),
        netAmount: money.optional()
      })
    )
    .optional(),
  paymentConditions: z
    .object({
      paymentTermLabel: text.optional(),
      paymentTermLabelTemplate: text.optional(),
      paymentTermDuration: count.optional(),
      paymentDiscountConditions: z
        .object({ discountPercentage: money.optional(), discountRange: count.optional() })
        .optional()
    })
    .optional(),
  shippingConditions: z
    .object({
      shippingDate: text.optional(),
      shippingEndDate: text.optional(),
      shippingType: text.optional()
    })
    .optional(),
  title: text.optional(),
  introduction: text.optional(),
  remark: text.optional(),
  archived: z.boolean().optional(),
  createdDate: text.optional(),
  updatedDate: text.optional(),
  version: count.optional(),
  electronicDocumentProfile: text.optional(),
  relatedVouchers: z
    .array(z.object({ id, voucherNumber: text.optional(), voucherType: text.optional() }))
    .optional()
});
export const voucherSchema = z.object({
  id,
  organizationId: text.optional(),
  resourceUri: text.optional(),
  type: text,
  voucherNumber: text.optional(),
  voucherDate: text.optional(),
  shippingDate: text.optional(),
  dueDate: text.optional(),
  totalGrossAmount: money.optional(),
  totalTaxAmount: money.optional(),
  taxType: text,
  voucherStatus: text.optional(),
  contactId: text.optional(),
  useCollectiveContact: z.boolean().optional(),
  remark: text.optional(),
  voucherItems: z
    .array(
      z.object({ amount: money, taxAmount: money, taxRatePercent: z.number(), categoryId: id })
    )
    .optional(),
  files: z.array(id).optional(),
  version: count,
  createdDate: text.optional(),
  updatedDate: text.optional()
});
export const voucherListSchema = z.object({
  id,
  voucherType: text,
  voucherStatus: text,
  voucherNumber: text.optional(),
  voucherDate: text.optional(),
  dueDate: text.optional(),
  contactId: text.optional(),
  contactName: text.optional(),
  totalAmount: money.optional(),
  openAmount: money.optional(),
  currency: text.optional(),
  archived: z.boolean().optional(),
  createdDate: text.optional(),
  updatedDate: text.optional()
});
export const pageSchema = <S extends z.ZodType>(item: S) =>
  z
    .object({
      content: z.array(item),
      first: z.boolean(),
      last: z.boolean(),
      totalPages: count,
      totalElements: count,
      numberOfElements: count,
      size: count.min(1).max(250),
      number: count
    })
    .refine(
      page =>
        page.content.length === page.numberOfElements && page.numberOfElements <= page.size
    );
export const profileSchema = z.object({
  organizationId: id,
  companyName: id,
  taxType: text.optional(),
  smallBusiness: z.boolean().optional(),
  connectionId: text.optional(),
  created: z
    .object({
      userId: text.optional(),
      userName: text.optional(),
      userEmail: text.optional(),
      date: text.optional()
    })
    .optional(),
  features: z.array(text).optional(),
  businessFeatures: z.array(text).optional(),
  subscriptionStatus: text.optional(),
  distanceSalesPrinciple: text.optional()
});
export const paymentSchema = z.object({
  openAmount: z.union([z.number(), z.string()]),
  currency: text.optional(),
  paymentStatus: text,
  voucherType: text.optional(),
  voucherStatus: text.optional(),
  paidDate: text.optional(),
  paymentItems: z.array(
    z.object({
      paymentItemType: text.optional(),
      postingDate: text.optional(),
      amount: money.optional(),
      currency: text.optional()
    })
  )
});
export const references = {
  posting_categories: z.array(
    z.object({
      id,
      name: text,
      type: text,
      contactRequired: z.boolean().optional(),
      splitAllowed: z.boolean().optional(),
      groupName: text.optional()
    })
  ),
  payment_conditions: z.array(
    z.object({
      id,
      paymentTermLabelTemplate: text.optional(),
      paymentTermDuration: count.optional(),
      organizationDefault: z.boolean().optional(),
      paymentDiscountConditions: z
        .object({ discountPercentage: money.optional(), discountRange: count.optional() })
        .optional()
    })
  ),
  countries: z.array(
    z.object({
      countryCode: id,
      countryNameDE: text.optional(),
      countryNameEN: text.optional(),
      taxClassification: text.optional()
    })
  ),
  print_layouts: z.array(z.object({ id, name: text, default: z.boolean().optional() }))
};
export type Contact = z.output<typeof contactSchema>;
export type Article = z.output<typeof articleSchema>;
export type Voucher = z.output<typeof voucherSchema>;
export const mapArticle = (article: Article) => ({
  ...article,
  type: article.type.toLowerCase(),
  price: {
    netPrice: article.price.netPrice,
    grossPrice: article.price.grossPrice,
    taxRatePercentage: article.price.taxRate,
    leadingPrice: article.price.leadingPrice.toLowerCase()
  }
});
export const mapVoucher = (voucher: Voucher) => ({
  ...voucher,
  voucherItems: voucher.voucherItems?.map(item => ({
    amount: item.amount,
    taxAmount: item.taxAmount,
    taxRatePercentage: item.taxRatePercent,
    categoryId: item.categoryId
  }))
});
export const resourceSchema = z.object({
  ...salesSchema.shape,
  ...contactSchema.partial().shape,
  ...voucherSchema.partial().shape,
  ...articleSchema.partial().shape,
  id,
  type: text.optional(),
  version: count.optional()
});
export const pageOutput = (page: {
  number: number;
  first: boolean;
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
}) => ({
  currentPage: page.number,
  first: page.first,
  last: page.last,
  nextPage: page.last ? undefined : page.number + 1,
  totalPages: page.totalPages,
  totalElements: page.totalElements,
  pageSize: page.size,
  searchWindowLimit: 10000,
  windowMayBeTruncated: page.totalElements >= 10000
});
