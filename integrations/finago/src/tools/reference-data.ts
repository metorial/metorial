import { SlateTool } from 'slates';
import { z } from 'zod';
import type { FinagoListResult, JsonRecord } from '../lib/client';
import { finagoServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';
import { listOutputSchema, maxPagesSchema } from './shared';

let referenceTypeSchema = z.enum([
  'taxes',
  'currencies',
  'payment_methods',
  'transaction_types',
  'fiscal_periods',
  'product_categories',
  'product_units',
  'price_lists',
  'price_list_prices',
  'sales_types',
  'dimensions',
  'dimension_elements'
]);

type ReferenceDataInput = {
  referenceType: z.infer<typeof referenceTypeSchema>;
  id?: number;
  dimensionType?: number;
  value?: string;
  fiscalPeriodType?: 'Year' | 'Period' | 'All';
  productIds?: string;
  limit?: number;
  continuationToken?: string;
};

type ReferenceDataRequest = {
  path: string;
  params?: JsonRecord;
  singleRecord: boolean;
};

let singleRecordResult = (record: unknown): FinagoListResult => ({
  records: [record],
  count: 1,
  pageCount: 1,
  hasNextPage: false
});

let failUnsupportedFields = (
  input: ReferenceDataInput,
  fields: Array<keyof ReferenceDataInput>,
  target: string
) => {
  let unsupported = fields.filter(field => input[field] !== undefined);
  if (unsupported.length > 0) {
    throw finagoServiceError(`${unsupported.join(', ')} is only supported for ${target}.`);
  }
};

let requireId = (input: ReferenceDataInput, target: string, min?: number) => {
  if (input.id === undefined) throw finagoServiceError(`id is required for ${target}.`);
  if (min !== undefined && input.id < min) {
    throw finagoServiceError(`id must be greater than or equal to ${min} for ${target}.`);
  }

  return input.id;
};

let encodePathValue = (value: number | string) => encodeURIComponent(String(value));

let referenceRequest = (input: ReferenceDataInput): ReferenceDataRequest => {
  let commonUnsupported: Array<keyof ReferenceDataInput> = [
    'fiscalPeriodType',
    'productIds',
    'limit',
    'continuationToken'
  ];

  switch (input.referenceType) {
    case 'taxes': {
      failUnsupportedFields(
        input,
        commonUnsupported,
        'fiscal_periods, price_list_prices, or dimension_elements'
      );
      failUnsupportedFields(
        input,
        ['dimensionType', 'value'],
        'dimensions or dimension_elements'
      );
      return input.id === undefined
        ? { path: '/taxes', singleRecord: false }
        : {
            path: `/taxes/${encodePathValue(requireId(input, 'taxes', 0))}`,
            singleRecord: true
          };
    }
    case 'currencies':
      failUnsupportedFields(
        input,
        ['id', 'dimensionType', 'value', ...commonUnsupported],
        'other reference types'
      );
      return { path: '/currencies', singleRecord: false };
    case 'payment_methods':
      failUnsupportedFields(
        input,
        ['id', 'dimensionType', 'value', ...commonUnsupported],
        'other reference types'
      );
      return { path: '/paymentmethods', singleRecord: false };
    case 'transaction_types':
      failUnsupportedFields(
        input,
        ['id', 'dimensionType', 'value', ...commonUnsupported],
        'other reference types'
      );
      return { path: '/transactiontypes', singleRecord: false };
    case 'fiscal_periods': {
      failUnsupportedFields(
        input,
        ['id', 'dimensionType', 'value', 'productIds', 'limit', 'continuationToken'],
        'fiscal_periods'
      );
      return {
        path: '/fiscalperiods',
        params: { type: input.fiscalPeriodType },
        singleRecord: false
      };
    }
    case 'product_categories': {
      failUnsupportedFields(
        input,
        commonUnsupported,
        'fiscal_periods, price_list_prices, or dimension_elements'
      );
      failUnsupportedFields(
        input,
        ['dimensionType', 'value'],
        'dimensions or dimension_elements'
      );
      return input.id === undefined
        ? { path: '/productcategories', singleRecord: false }
        : {
            path: `/productcategories/${encodePathValue(
              requireId(input, 'product_categories', 1)
            )}`,
            singleRecord: true
          };
    }
    case 'product_units':
      failUnsupportedFields(
        input,
        ['id', 'dimensionType', 'value', ...commonUnsupported],
        'other reference types'
      );
      return { path: '/productunits', singleRecord: false };
    case 'price_lists': {
      failUnsupportedFields(
        input,
        commonUnsupported,
        'fiscal_periods, price_list_prices, or dimension_elements'
      );
      failUnsupportedFields(
        input,
        ['dimensionType', 'value'],
        'dimensions or dimension_elements'
      );
      return input.id === undefined
        ? { path: '/pricelists', singleRecord: false }
        : {
            path: `/pricelists/${encodePathValue(requireId(input, 'price_lists'))}`,
            singleRecord: true
          };
    }
    case 'price_list_prices': {
      failUnsupportedFields(
        input,
        ['dimensionType', 'value', 'fiscalPeriodType', 'limit', 'continuationToken'],
        'price_list_prices'
      );
      return {
        path: `/pricelists/${encodePathValue(requireId(input, 'price_list_prices'))}/prices`,
        params: { productIds: input.productIds },
        singleRecord: false
      };
    }
    case 'sales_types': {
      failUnsupportedFields(
        input,
        commonUnsupported,
        'fiscal_periods, price_list_prices, or dimension_elements'
      );
      failUnsupportedFields(
        input,
        ['dimensionType', 'value'],
        'dimensions or dimension_elements'
      );
      return input.id === undefined
        ? { path: '/salestypes', singleRecord: false }
        : {
            path: `/salestypes/${encodePathValue(requireId(input, 'sales_types'))}`,
            singleRecord: true
          };
    }
    case 'dimensions': {
      failUnsupportedFields(input, ['id', 'value', ...commonUnsupported], 'dimensions');
      return input.dimensionType === undefined
        ? { path: '/dimensions', singleRecord: false }
        : { path: `/dimensions/${input.dimensionType}`, singleRecord: true };
    }
    case 'dimension_elements': {
      failUnsupportedFields(
        input,
        ['id', 'fiscalPeriodType', 'productIds'],
        'dimension_elements'
      );
      if (!input.dimensionType) {
        throw finagoServiceError('dimensionType is required for dimension_elements.');
      }
      if (
        input.value !== undefined &&
        (input.limit !== undefined || input.continuationToken !== undefined)
      ) {
        throw finagoServiceError(
          'limit and continuationToken are only supported when listing dimension_elements.'
        );
      }

      return input.value === undefined
        ? {
            path: `/dimensions/${input.dimensionType}/elements`,
            params: {
              limit: input.limit,
              continuationToken: input.continuationToken
            },
            singleRecord: false
          }
        : {
            path: `/dimensions/${input.dimensionType}/elements/${encodePathValue(input.value)}`,
            singleRecord: true
          };
    }
  }
};

export let finagoListReferenceData = SlateTool.create(spec, {
  name: 'List Reference Data',
  key: 'finago_list_reference_data',
  description:
    'Read Finago reference data used by accounting, product, and sales workflows, including taxes, currencies, payment methods, transaction types, periods, product categories, units, price lists, sales types, and dimensions.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      referenceType: referenceTypeSchema.describe('The Finago reference data family to read.'),
      id: z.coerce
        .number()
        .int()
        .optional()
        .describe(
          'Optional integer ID for taxes, product_categories, price_lists, and sales_types. Required as the pricelist ID for price_list_prices.'
        ),
      dimensionType: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Dimension type ID, required for dimension_elements.'),
      value: z
        .string()
        .optional()
        .describe('Dimension element value/key when reading one dimension element.'),
      fiscalPeriodType: z
        .enum(['Year', 'Period', 'All'])
        .optional()
        .describe('Only for fiscal_periods. Filter by Year, Period, or All.'),
      productIds: z
        .string()
        .optional()
        .describe('Only for price_list_prices. Product IDs/ranges, e.g. "1..10,20".'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Only for dimension_elements list requests. Maximum number of elements.'),
      continuationToken: z
        .string()
        .optional()
        .describe(
          'Only for dimension_elements list requests. Continuation token from a next Link.'
        ),
      maxPages: maxPagesSchema
    })
  )
  .output(listOutputSchema)
  .handleInvocation(async ctx => {
    let request = referenceRequest(ctx.input);
    let client = createClientFromContext(ctx);
    let operation = `read ${ctx.input.referenceType}`;
    let result = request.singleRecord
      ? singleRecordResult(await client.get(request.path, request.params, operation))
      : await client.list(request.path, request.params, ctx.input.maxPages ?? 1, operation);

    return {
      output: result,
      message: `Retrieved **${result.count}** Finago ${ctx.input.referenceType.replace(/_/g, ' ')} record(s).`
    };
  })
  .build();
