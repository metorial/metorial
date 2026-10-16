import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let parametersSchema = z
  .record(z.string(), z.unknown())
  .describe(
    'Target Product Data API parameters using provider names, such as type, tcin, dpci, gtin, url, search_term, category_id, customer_zipcode, and custom_id. Do not include api_key.'
  );

export let manageCollectionRequests = SlateTool.create(spec, {
  name: 'Manage Collection Requests',
  key: 'manage_collection_requests',
  description:
    'List, add, update, or delete requests inside a RedCircle collection. Add product, review, search, category, or store-stock requests before starting a collection.',
  instructions: [
    'Use manage_collections with action list to discover collection IDs.',
    'List requests to discover request IDs. Lists contain up to 1,000 requests per page.',
    'For add, provide an array of requests; each request needs a type and the identifiers required by that request type.',
    'For update, provide requestId and the parameters to change. For delete, provide requestId.',
    'Modify requests only while the collection is not running. Submit mutation calls sequentially.'
  ],
  constraints: [
    'Up to 1,000 requests may be added per call.',
    'A collection supports up to 15,000 requests, or 100 when include_html is enabled.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'update', 'delete']).describe('Request operation.'),
      collectionId: z
        .string()
        .min(1)
        .describe('Collection ID from manage_collections with action list.'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Request page for list; defaults to 1.'),
      requests: z
        .array(parametersSchema)
        .min(1)
        .max(1000)
        .optional()
        .describe('Requests to add. Required for add.'),
      requestId: z
        .string()
        .optional()
        .describe(
          'Request ID from this tool with action list. Required for update and delete.'
        ),
      parameters: parametersSchema
        .optional()
        .describe('Fields to change using provider parameter names. Required for update.')
    })
  )
  .output(
    z.object({
      requests: z
        .array(z.unknown())
        .optional()
        .describe('Provider requests and their stable IDs for list.'),
      currentPage: z.number().optional().describe('Current request page.'),
      pageCount: z.number().optional().describe('Total request pages.'),
      collection: z.unknown().optional().describe('Updated collection metadata for add.'),
      request: z.unknown().optional().describe('Updated request fields for update.'),
      requestInfo: z.unknown().optional().describe('Provider confirmation metadata.')
    })
  )
  .handleInvocation(async ctx => {
    if (['update', 'delete'].includes(ctx.input.action) && !ctx.input.requestId?.trim()) {
      throw createApiServiceError(
        'Provide requestId. List requests in this collection to find request IDs.'
      );
    }
    if (ctx.input.action === 'add' && !ctx.input.requests?.length) {
      throw createApiServiceError('Provide at least one request to add.');
    }
    if (
      ctx.input.action === 'update' &&
      (!ctx.input.parameters || !Object.keys(ctx.input.parameters).length)
    ) {
      throw createApiServiceError('Provide at least one request parameter to update.');
    }
    let payloads =
      ctx.input.action === 'add'
        ? (ctx.input.requests ?? [])
        : ctx.input.action === 'update'
          ? [ctx.input.parameters!]
          : [];
    for (let parameters of payloads) {
      if ('api_key' in parameters) {
        throw createApiServiceError(
          'Omit api_key from request parameters. The connected account supplies authentication.'
        );
      }
      if (ctx.input.action === 'add') {
        if (
          !['product', 'reviews', 'search', 'category', 'store_stock'].includes(
            String(parameters.type)
          )
        ) {
          throw createApiServiceError(
            'Each request needs type product, reviews, search, category, or store_stock.'
          );
        }
        let hasText = (key: string) =>
          typeof parameters[key] === 'string' && parameters[key].trim().length > 0;
        if (
          ['product', 'reviews', 'store_stock'].includes(String(parameters.type)) &&
          !['tcin', 'dpci', 'gtin', 'url'].some(hasText)
        ) {
          throw createApiServiceError(
            'Product, review, and store-stock requests need tcin, dpci, gtin, or url.'
          );
        }
        if (parameters.type === 'search' && !hasText('search_term') && !hasText('url')) {
          throw createApiServiceError('Search requests need search_term or url.');
        }
        if (parameters.type === 'category' && !hasText('category_id') && !hasText('url')) {
          throw createApiServiceError('Category requests need category_id or url.');
        }
        if (parameters.type === 'store_stock' && !hasText('store_stock_zipcode')) {
          throw createApiServiceError('Store-stock requests need store_stock_zipcode.');
        }
      }
    }
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.action === 'list') {
      let data = await client.listCollectionRequests(
        ctx.input.collectionId,
        ctx.input.page ?? 1
      );
      return {
        output: {
          requests: data.requests,
          currentPage: data.requests_page_current,
          pageCount: data.requests_page_count,
          requestInfo: data.request_info
        },
        message: `Retrieved requests for collection **${ctx.input.collectionId}**.`
      };
    }
    let data =
      ctx.input.action === 'add'
        ? await client.addCollectionRequests(ctx.input.collectionId, ctx.input.requests!)
        : ctx.input.action === 'update'
          ? await client.updateCollectionRequest(
              ctx.input.collectionId,
              ctx.input.requestId!,
              ctx.input.parameters!
            )
          : await client.deleteCollectionRequest(ctx.input.collectionId, ctx.input.requestId!);
    return {
      output: {
        collection: data.collection,
        request: data.request,
        requestInfo: data.request_info
      },
      message:
        ctx.input.action === 'add'
          ? 'Added requests to the collection.'
          : ctx.input.action === 'update'
            ? 'Updated the collection request.'
            : 'Deleted the collection request.'
    };
  })
  .build();
