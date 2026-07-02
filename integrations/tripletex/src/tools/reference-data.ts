import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { tripletexValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  commonParams,
  companyIdFor,
  createClient,
  listMetadataSchema,
  listOutput,
  pagingInputShape,
  rawRecordSchema
} from './shared';

let referenceResourceTypeSchema = z.enum([
  'ledger_accounts',
  'vat_types',
  'voucher_types',
  'invoice_payment_types',
  'outgoing_payment_types',
  'departments',
  'currencies',
  'product_units',
  'product_groups',
  'customer_supplier_categories'
]);

let referenceRecordSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  number: z.string().optional(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  code: z.string().optional(),
  isInactive: z.boolean().optional(),
  raw: rawRecordSchema
});

type ReferenceResourceType = z.infer<typeof referenceResourceTypeSchema>;

let allowedCommonReferenceFields = new Set([
  'resourceType',
  'from',
  'count',
  'sorting',
  'fields',
  'companyId'
]);

let referenceResources: Record<
  ReferenceResourceType,
  {
    path: string;
    label: string;
    allowedFilters: Set<string>;
  }
> = {
  ledger_accounts: {
    path: '/ledger/account',
    label: 'ledger account',
    allowedFilters: new Set([
      'id',
      'number',
      'isBankAccount',
      'isInactive',
      'isApplicableForSupplierInvoice',
      'ledgerType',
      'isBalanceAccount',
      'saftCode'
    ])
  },
  vat_types: {
    path: '/ledger/vatType',
    label: 'VAT type',
    allowedFilters: new Set([
      'id',
      'number',
      'typeOfVat',
      'vatDate',
      'shouldIncludeSpecificationTypes'
    ])
  },
  voucher_types: {
    path: '/ledger/voucherType',
    label: 'voucher type',
    allowedFilters: new Set(['name'])
  },
  invoice_payment_types: {
    path: '/invoice/paymentType',
    label: 'invoice payment type',
    allowedFilters: new Set(['id', 'description', 'query'])
  },
  outgoing_payment_types: {
    path: '/ledger/paymentTypeOut',
    label: 'outgoing payment type',
    allowedFilters: new Set(['id', 'description', 'isInactive'])
  },
  departments: {
    path: '/department',
    label: 'department',
    allowedFilters: new Set([
      'id',
      'name',
      'departmentNumber',
      'departmentManagerId',
      'isInactive'
    ])
  },
  currencies: {
    path: '/currency',
    label: 'currency',
    allowedFilters: new Set(['id', 'code'])
  },
  product_units: {
    path: '/product/unit',
    label: 'product unit',
    allowedFilters: new Set(['id', 'name', 'nameShort', 'commonCode'])
  },
  product_groups: {
    path: '/product/group',
    label: 'product group',
    allowedFilters: new Set(['id', 'name', 'query'])
  },
  customer_supplier_categories: {
    path: '/customer/category',
    label: 'customer/supplier category',
    allowedFilters: new Set(['id', 'name', 'number', 'description', 'type'])
  }
};

let numberAsString = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
};

let mapReferenceRecord = (value: unknown): z.infer<typeof referenceRecordSchema> => {
  let record = asRecord(value);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    number:
      numberAsString(record.number) ??
      numberAsString(record.numberPretty) ??
      numberAsString(record.departmentNumber),
    name: asString(record.name),
    displayName: asString(record.displayName),
    description: asString(record.description),
    code: asString(record.code) ?? asString(record.commonCode),
    isInactive: asBoolean(record.isInactive),
    raw: record
  };
};

let ensureAllowedReferenceFilters = (
  input: Record<string, unknown>,
  resourceType: ReferenceResourceType
) => {
  let allowed = referenceResources[resourceType].allowedFilters;

  for (let [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (allowedCommonReferenceFields.has(key) || allowed.has(key)) continue;

    throw tripletexValidationError(
      `${key} is not supported for ${referenceResources[resourceType].label} reference data.`
    );
  }
};

export let listReferenceData = SlateTool.create(spec, {
  name: 'List Reference Data',
  key: 'list_reference_data',
  description:
    'List Tripletex reference data needed by accounting tools, including ledger accounts, VAT types, voucher types, invoice payment types, outgoing payment types, departments, currencies, product units, product groups, and customer/supplier categories.',
  instructions: [
    'Choose resourceType for the reference data family to list.',
    'Use ledger_accounts to find account ids for vouchers and postings.',
    'Use invoice_payment_types to find paymentTypeId for invoice payment registration.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: referenceResourceTypeSchema.describe('Reference data family to list'),
      id: z.string().optional().describe('Comma-separated ids'),
      number: z.string().optional().describe('Comma-separated numbers where supported'),
      name: z.string().optional(),
      query: z.string().optional(),
      description: z.string().optional(),
      code: z.string().optional().describe('Currency code where resourceType is currencies'),
      isInactive: z.boolean().optional(),
      isBankAccount: z.boolean().optional(),
      isApplicableForSupplierInvoice: z.boolean().optional(),
      ledgerType: z.string().optional(),
      isBalanceAccount: z.boolean().optional(),
      saftCode: z.string().optional(),
      typeOfVat: z.string().optional(),
      vatDate: z.string().optional().describe('VAT date, YYYY-MM-DD'),
      shouldIncludeSpecificationTypes: z.boolean().optional(),
      departmentNumber: z.string().optional(),
      departmentManagerId: z.string().optional().describe('Comma-separated employee ids'),
      nameShort: z.string().optional(),
      commonCode: z.string().optional(),
      type: z.string().optional().describe('Category type for customer/supplier categories'),
      ...pagingInputShape
    })
  )
  .output(
    z.object({
      resourceType: referenceResourceTypeSchema,
      records: z.array(referenceRecordSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureAllowedReferenceFilters(ctx.input, ctx.input.resourceType);

    let client = createClient(ctx);
    let resource = referenceResources[ctx.input.resourceType];
    let response = await client.list(
      resource.path,
      pickDefined({
        ...commonParams(ctx.input),
        id: ctx.input.id,
        number: ctx.input.number,
        name: ctx.input.name,
        query: ctx.input.query,
        description: ctx.input.description,
        code: ctx.input.code,
        isInactive: ctx.input.isInactive,
        isBankAccount: ctx.input.isBankAccount,
        isApplicableForSupplierInvoice: ctx.input.isApplicableForSupplierInvoice,
        ledgerType: ctx.input.ledgerType,
        isBalanceAccount: ctx.input.isBalanceAccount,
        saftCode: ctx.input.saftCode,
        typeOfVat: ctx.input.typeOfVat,
        vatDate: ctx.input.vatDate,
        shouldIncludeSpecificationTypes: ctx.input.shouldIncludeSpecificationTypes,
        departmentNumber: ctx.input.departmentNumber,
        departmentManagerId: ctx.input.departmentManagerId,
        nameShort: ctx.input.nameShort,
        commonCode: ctx.input.commonCode,
        type: ctx.input.type
      }),
      companyIdFor(ctx, ctx.input.companyId)
    );
    let records = (response.values ?? []).map(mapReferenceRecord);

    return {
      output: {
        resourceType: ctx.input.resourceType,
        records,
        ...listOutput(response)
      },
      message: `Found **${records.length}** Tripletex ${resource.label} reference record(s).`
    };
  })
  .build();
