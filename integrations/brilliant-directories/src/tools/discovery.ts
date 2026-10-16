import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const modelSchema = z.enum([
  'user',
  'leads',
  'data_posts',
  'users_portfolio_groups',
  'users_portfolio',
  'users_reviews',
  'data_categories',
  'data_widgets',
  'unsubscribe_list',
  'users_clicks'
]);

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Verify the connected API key and retrieve its website URL and key name.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string(),
      website: z.string().describe('The website associated with the API key.'),
      keyName: z.string().describe('The name assigned to the API key.'),
      raw: z.record(z.string(), z.any()).describe('The complete provider response.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    }).verifyToken();
    if (
      !isApiErrorRecord(result.message) ||
      typeof result.message.website !== 'string' ||
      typeof result.message.key !== 'string'
    ) {
      throw createApiServiceError(
        'Brilliant Directories returned an invalid API-key identity response.'
      );
    }
    return {
      output: {
        status: result.status,
        website: result.message.website,
        keyName: result.message.key,
        raw: result
      },
      message: 'Retrieved the connected website and API-key identity.'
    };
  })
  .build();

export let listRecords = SlateTool.create(spec, {
  name: 'List Directory Records',
  key: 'list_records',
  description:
    'List members, leads, posts, photo albums, album photos, reviews, post types, widgets, unsubscribe records, or click records. Use data_categories to discover post type IDs and data_type values before creating posts or albums. Supports cursor pagination, field filters, and sorting.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      model: modelSchema.describe('The directory resource to list.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Records per page. The provider defaults to 25.'),
      page: z
        .string()
        .optional()
        .describe(
          'The next_page or prev_page cursor from the previous raw response. Omit for the first page.'
        ),
      filters: z
        .array(
          z.object({
            property: z.string().describe('Field to filter on.'),
            value: z
              .string()
              .optional()
              .describe(
                'Value to match. May be omitted for is_null, is_not_null, is_set, or is_not_set.'
              ),
            logic: z
              .string()
              .optional()
              .describe(
                'Documented comparison operator, such as equals, contains, in, gte, or is_null. Defaults to equals.'
              ),
            operator: z
              .enum(['AND', 'OR'])
              .optional()
              .describe('Clause group. Defaults to AND.')
          })
        )
        .optional(),
      orderColumn: z
        .string()
        .optional()
        .describe('Column to sort by; a comma-separated list supports multiple columns.'),
      orderType: z
        .string()
        .optional()
        .describe('ASC, DESC, or RAND. Multiple directions may be comma-separated.')
    })
  )
  .output(
    z.object({
      status: z.string(),
      records: z
        .array(z.any())
        .describe('The records on this page, with all provider fields preserved.'),
      raw: z
        .record(z.string(), z.any())
        .describe(
          'The complete provider response, including totals and any next_page or prev_page cursors.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let params = new URLSearchParams();
    if (ctx.input.limit !== undefined) params.set('limit', String(ctx.input.limit));
    if (ctx.input.page !== undefined) params.set('page', ctx.input.page);
    if (ctx.input.orderColumn !== undefined) params.set('order_column', ctx.input.orderColumn);
    if (ctx.input.orderType !== undefined) params.set('order_type', ctx.input.orderType);
    for (let [index, filter] of (ctx.input.filters ?? []).entries()) {
      let valueless = [
        'is null',
        'is_null',
        'is not null',
        'is_not_null',
        'is set',
        'is_set',
        'is not set',
        'is_not_set'
      ].includes(filter.logic?.toLowerCase() ?? '');
      if (filter.value === undefined && !valueless) {
        throw createApiServiceError(
          `filters[${index}].value is required for this comparison operator.`
        );
      }
      params.append(`property[${index}]`, filter.property);
      if (filter.value !== undefined) params.append(`property_value[${index}]`, filter.value);
      if (filter.logic !== undefined) params.append(`property_logic[${index}]`, filter.logic);
      if (filter.operator !== undefined)
        params.append(`property_operator[${index}]`, filter.operator);
    }
    let result = await new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    }).listRecords(ctx.input.model, params);
    if (!Array.isArray(result.message)) {
      throw createApiServiceError('Brilliant Directories returned an invalid record list.');
    }
    return {
      output: { status: result.status, records: result.message, raw: result },
      message: `Retrieved ${result.message.length} records on this page.`
    };
  })
  .build();

export let getWritableFields = SlateTool.create(spec, {
  name: 'Get Writable Fields',
  key: 'get_writable_fields',
  description:
    'Discover the writable fields for a directory resource. For posts and photo albums, supply the post type form name to include its custom fields.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      model: modelSchema.describe('The directory resource to inspect.'),
      formName: z
        .string()
        .optional()
        .describe(
          'Post type form_name from list_records with model data_categories. Applies to data_posts and users_portfolio_groups.'
        )
    })
  )
  .output(
    z.object({
      fields: z
        .array(z.any())
        .describe('The complete writable-field definitions returned by the provider.')
    })
  )
  .handleInvocation(async ctx => {
    let fields = await new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    }).getFields(ctx.input.model, ctx.input.formName);
    return {
      output: { fields },
      message: `Retrieved ${fields.length} writable-field definitions.`
    };
  })
  .build();
