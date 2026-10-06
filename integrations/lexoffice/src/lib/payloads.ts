import { pickDefined } from 'slates';
import type { z } from 'zod';
import type { Article, Contact, salesSchema, Voucher } from './schemas';
import { countryCode, dateTime, decimal, fail, integer, required } from './validation';

type ContactInput = Omit<Contact, 'id' | 'version'> & { version?: number };
export const validateContact = (contact: ContactInput, creating = false) => {
  if (Boolean(contact.company) === Boolean(contact.person))
    fail('Provide exactly one company or person.');
  if (!contact.roles?.customer && !contact.roles?.vendor)
    fail('At least one customer or vendor role is required.');
  if (contact.company) required(contact.company.name, 'company.name');
  if (contact.person) required(contact.person.lastName, 'person.lastName');
  if (contact.note !== undefined && contact.note.length > 1000)
    fail('note must not exceed 1000 characters.');
  if (contact.xRechnung?.buyerReference)
    required(contact.xRechnung.vendorNumberAtCustomer, 'xRechnung.vendorNumberAtCustomer');
  for (const list of [
    contact.addresses?.billing,
    contact.addresses?.shipping,
    contact.company?.contactPersons,
    ...Object.values(contact.emailAddresses ?? {}),
    ...Object.values(contact.phoneNumbers ?? {})
  ])
    if (list && list.length > 1)
      fail(
        'The API permits at most one entry in each address, email, phone and contact-person list.'
      );
  for (const address of [
    ...(contact.addresses?.billing ?? []),
    ...(contact.addresses?.shipping ?? [])
  ])
    countryCode(address.countryCode, 'Address countryCode');
  for (const person of contact.company?.contactPersons ?? []) {
    required(person.lastName, 'Contact person lastName');
    if (person.salutation && person.salutation.length > 25)
      fail('Contact person salutation must not exceed 25 characters.');
  }
  if (
    creating &&
    (contact.roles?.customer?.number !== undefined ||
      contact.roles?.vendor?.number !== undefined)
  )
    fail(
      'Customer and vendor numbers are assigned by Lexoffice and cannot be supplied when creating a contact.'
    );
  integer(contact.version, 'version');
  return contact;
};
export const contactPayload = (contact: ContactInput, creating = false) => {
  validateContact(contact, creating);
  return {
    ...pickDefined(contact),
    version: creating ? 0 : contact.version,
    roles: {
      ...(contact.roles?.customer ? { customer: {} } : {}),
      ...(contact.roles?.vendor ? { vendor: {} } : {})
    }
  };
};
export type ArticleInput = {
  title?: string;
  description?: string;
  type?: 'product' | 'service';
  articleNumber?: string;
  gtin?: string;
  note?: string;
  unitName?: string;
  expectedVersion?: number;
  price?: {
    netPrice?: number;
    grossPrice?: number;
    taxRatePercentage?: number | string;
    leadingPrice?: 'net' | 'gross';
  };
};
export const articlePayload = (input: ArticleInput, current?: Article) => {
  if (input.expectedVersion !== undefined) {
    integer(input.expectedVersion, 'expectedVersion');
    if (!current || current.version !== input.expectedVersion)
      fail('The article version changed; retrieve it again before updating.');
  }
  const value = {
    ...(current
      ? {
          title: current.title,
          description: current.description,
          type: current.type.toLowerCase(),
          articleNumber: current.articleNumber,
          gtin: current.gtin,
          note: current.note,
          unitName: current.unitName
        }
      : {}),
    ...pickDefined(input)
  };
  required(value.title, 'title');
  required(value.unitName, 'unitName');
  if (value.type !== 'product' && value.type !== 'service')
    fail('type is required for article creation.');
  const price = {
    ...(current
      ? {
          netPrice: current.price.netPrice,
          grossPrice: current.price.grossPrice,
          taxRatePercentage: current.price.taxRate,
          leadingPrice: current.price.leadingPrice.toLowerCase()
        }
      : {}),
    ...pickDefined(input.price ?? {})
  };
  if (price.leadingPrice !== 'net' && price.leadingPrice !== 'gross')
    fail('price.leadingPrice is required.');
  const taxRate = Number(price.taxRatePercentage);
  if (![0, 7, 19].includes(taxRate)) fail('price.taxRatePercentage must be 0, 7 or 19.');
  const selected = price.leadingPrice === 'net' ? price.netPrice : price.grossPrice;
  if (
    input.price &&
    ((price.leadingPrice === 'net' && input.price.grossPrice !== undefined) ||
      (price.leadingPrice === 'gross' && input.price.netPrice !== undefined))
  )
    fail(
      'Supply only the selected leading price; the other price is calculated by Lexoffice.'
    );
  if (selected === undefined)
    fail(
      `price.${price.leadingPrice === 'net' ? 'netPrice' : 'grossPrice'} is required for the leading price.`
    );
  decimal(selected, 'Article price', 4);
  if (value.gtin && !/^\d{8}$|^\d{12,14}$/.test(value.gtin))
    fail('gtin must contain 8, 12, 13 or 14 digits.');
  return {
    ...pickDefined({
      title: value.title,
      description: value.description,
      articleNumber: value.articleNumber,
      gtin: value.gtin,
      note: value.note,
      unitName: value.unitName
    }),
    type: value.type.toUpperCase(),
    price: {
      leadingPrice: price.leadingPrice.toUpperCase(),
      taxRate,
      ...(price.leadingPrice === 'net' ? { netPrice: selected } : { grossPrice: selected })
    },
    ...(current ? { version: current.version } : {})
  };
};
export type VoucherInput = {
  type?: string;
  voucherNumber?: string;
  voucherDate?: string;
  dueDate?: string;
  totalGrossAmount?: number;
  totalTaxAmount?: number;
  taxType?: string;
  voucherStatus?: string;
  contactId?: string;
  useCollectiveContact?: boolean;
  expectedVersion?: number;
  voucherItems?: {
    amount: number;
    taxAmount: number;
    taxRatePercentage: number;
    categoryId: string;
  }[];
};
export const voucherPayload = (input: VoucherInput, current?: Voucher) => {
  if (input.expectedVersion !== undefined) {
    integer(input.expectedVersion, 'expectedVersion');
    if (!current || current.version !== input.expectedVersion)
      fail('The voucher version changed; retrieve it again before updating.');
  }
  if (current && !Array.isArray(current.files))
    fail(
      'Existing voucher files were not returned as an explicit list; updating could delete them.'
    );
  if (current && current.voucherStatus === undefined)
    fail('Existing voucher status is unknown; update was refused.');
  if (current?.voucherStatus === 'unchecked' && input.voucherStatus !== 'open')
    fail('An unchecked voucher can only be updated when explicitly finalized to open.');
  if (
    current &&
    input.voucherStatus !== undefined &&
    input.voucherStatus !== current.voucherStatus &&
    !(current.voucherStatus === 'unchecked' && input.voucherStatus === 'open')
  )
    fail('The API cannot change this voucher status.');
  if (
    !current &&
    input.voucherStatus !== undefined &&
    !['open', 'unchecked'].includes(input.voucherStatus)
  )
    fail('Voucher creation supports only open or unchecked status.');
  const value = {
    ...(current
      ? {
          type: current.type,
          voucherNumber: current.voucherNumber,
          voucherDate: current.voucherDate,
          shippingDate: current.shippingDate,
          dueDate: current.dueDate,
          totalGrossAmount: current.totalGrossAmount,
          totalTaxAmount: current.totalTaxAmount,
          taxType: current.taxType,
          contactId: current.contactId,
          useCollectiveContact: current.useCollectiveContact,
          remark: current.remark,
          voucherItems: current.voucherItems,
          voucherStatus: current.voucherStatus
        }
      : {}),
    ...pickDefined(input),
    voucherItems:
      input.voucherItems?.map(item => ({
        amount: item.amount,
        taxAmount: item.taxAmount,
        taxRatePercent: item.taxRatePercentage,
        categoryId: item.categoryId
      })) ?? current?.voucherItems
  };
  required(value.type, 'type');
  required(value.taxType, 'taxType');
  if (
    !['salesinvoice', 'salescreditnote', 'purchaseinvoice', 'purchasecreditnote'].includes(
      value.type!
    )
  )
    fail('Unsupported bookkeeping voucher type.');
  if (value.useCollectiveContact !== true)
    required(value.contactId, 'contactId (or explicitly set useCollectiveContact to true)');
  const unchecked = value.voucherStatus === 'unchecked';
  if (unchecked && value.taxType === 'net')
    fail('Unchecked vouchers cannot use net taxation.');
  if (!unchecked) {
    required(value.voucherNumber, 'voucherNumber');
    required(value.voucherDate, 'voucherDate');
    if (value.totalGrossAmount === undefined || value.totalTaxAmount === undefined)
      fail('totalGrossAmount and totalTaxAmount are required.');
    if (!value.voucherItems?.length) fail('voucherItems are required.');
  }
  decimal(value.totalGrossAmount, 'totalGrossAmount');
  decimal(value.totalTaxAmount, 'totalTaxAmount');
  for (const item of value.voucherItems ?? []) {
    decimal(item.amount, 'Voucher item amount');
    decimal(item.taxAmount, 'Voucher item taxAmount');
    decimal(item.taxRatePercent, 'Voucher item tax rate');
    required(item.categoryId, 'categoryId');
    if (item.taxRatePercent < 0 || item.taxRatePercent > 100)
      fail('Voucher tax rate must be between 0 and 100.');
  }
  if (input.contactId !== undefined && input.useCollectiveContact === undefined)
    value.useCollectiveContact = false;
  const { expectedVersion: _expectedVersion, ...payload } = value;
  return {
    ...pickDefined(payload),
    voucherDate: dateTime(value.voucherDate, 'voucherDate'),
    dueDate: dateTime(value.dueDate, 'dueDate'),
    ...(current ? { version: current.version, files: current.files } : {})
  };
};
type SalesInput = Omit<z.output<typeof salesSchema>, 'id'>;
export const salesPayload = (
  input: SalesInput,
  kind: 'invoice' | 'quotation' | 'credit_note' | 'order_confirmation'
) => {
  if (!input.address?.contactId) {
    required(input.address?.name, 'address.name');
    countryCode(input.address?.countryCode, 'address.countryCode');
  } else required(input.address.contactId, 'address.contactId');
  if (!input.lineItems?.length || input.lineItems.length > 300)
    fail('Provide between 1 and 300 line items.');
  const taxType = required(input.taxConditions?.taxType, 'taxConditions.taxType');
  const lineItems = input.lineItems.map(item => {
    required(item.name, 'Line item name');
    if (item.type !== 'custom' && item.type !== 'text')
      fail('Only custom and text line items are supported by these creation tools.');
    if (item.type === 'custom') {
      if (item.quantity === undefined) fail('Custom line items require quantity.');
      decimal(item.quantity, 'quantity', 4);
      required(item.unitName, 'unitName');
      if (!item.unitPrice || item.unitPrice.currency !== 'EUR')
        fail('Custom line items require unitPrice in EUR.');
      const amount =
        taxType === 'gross' ? item.unitPrice.grossAmount : item.unitPrice.netAmount;
      if (amount === undefined)
        fail(
          `unitPrice.${taxType === 'gross' ? 'grossAmount' : 'netAmount'} is required for this tax type.`
        );
      decimal(amount, 'Unit price', 4);
      decimal(item.unitPrice.netAmount, 'netAmount', 4);
      decimal(item.unitPrice.grossAmount, 'grossAmount', 4);
      decimal(item.unitPrice.taxRatePercentage, 'taxRatePercentage');
      if (
        item.unitPrice.taxRatePercentage === undefined ||
        item.unitPrice.taxRatePercentage < 0 ||
        item.unitPrice.taxRatePercentage > 100
      )
        fail('A valid taxRatePercentage is required.');
      if (!['net', 'gross'].includes(taxType) && item.unitPrice.taxRatePercentage !== 0)
        fail('VAT-free tax types require taxRatePercentage 0.');
    }
    decimal(item.discountPercentage, 'discountPercentage');
    if (kind === 'credit_note' && item.discountPercentage !== undefined)
      fail('Credit notes do not support line item discounts.');
    if (
      item.discountPercentage !== undefined &&
      (item.discountPercentage < 0 || item.discountPercentage > 100)
    )
      fail('discountPercentage must be between 0 and 100.');
    return item;
  });
  if (kind === 'quotation' && !input.expirationDate)
    fail('expirationDate is required for quotations.');
  if (['invoice', 'order_confirmation'].includes(kind) && !input.shippingConditions)
    fail('shippingConditions is required; explicitly choose the applicable shippingType.');
  const shipping = input.shippingConditions;
  if (kind === 'quotation' && shipping)
    fail('Quotation shippingConditions is not supported by this endpoint.');
  if (shipping && shipping.shippingType !== 'none') {
    required(shipping.shippingDate, 'shippingDate');
    if (['serviceperiod', 'deliveryperiod'].includes(shipping.shippingType ?? ''))
      required(shipping.shippingEndDate, 'shippingEndDate');
    if (
      shipping.shippingEndDate &&
      Date.parse(dateTime(shipping.shippingEndDate, 'shippingEndDate')!) <
        Date.parse(dateTime(shipping.shippingDate, 'shippingDate')!)
    )
      fail('shippingEndDate must not precede shippingDate.');
  }
  integer(input.paymentConditions?.paymentTermDuration, 'paymentTermDuration');
  if (input.paymentConditions?.paymentTermLabelTemplate !== undefined)
    fail('paymentTermLabelTemplate is read-only; provide paymentTermLabel instead.');
  const voucherDate = dateTime(input.voucherDate, 'voucherDate') ?? new Date().toISOString();
  const expirationDate = dateTime(input.expirationDate, 'expirationDate');
  if (expirationDate && Date.parse(expirationDate) < Date.parse(voucherDate))
    fail('expirationDate must not precede voucherDate.');
  return pickDefined({
    address: input.address,
    lineItems,
    totalPrice: input.totalPrice ?? { currency: 'EUR' },
    taxConditions: input.taxConditions,
    paymentConditions: input.paymentConditions,
    shippingConditions: shipping
      ? pickDefined({
          shippingType: shipping.shippingType,
          shippingDate: dateTime(shipping.shippingDate, 'shippingDate'),
          shippingEndDate: dateTime(shipping.shippingEndDate, 'shippingEndDate')
        })
      : undefined,
    title: input.title,
    introduction: input.introduction,
    remark: input.remark,
    voucherDate,
    expirationDate
  });
};
