import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient, requireRecord } from '../lib/client';
import { spec } from '../spec';

export let manageCollectionRequests = SlateTool.create(spec, {
  key: 'manage_collection_requests',
  name: 'Manage Collection Requests',
  description:
    'Add, update, delete, or clear requests in a collection that is not running. Discover collection IDs with list_collections and request IDs with list_collection_requests. Adding requests does not run the collection; manage_collection start spends request credits.',
  instructions: [
    'Use add with requests, update with requestId and parameters, delete with requestId, or clear to remove every request.',
    'Request objects use provider snake_case parameter names, such as type, ebay_domain, epid, search_term, url, and custom_id. Omit api_key; the connection supplies authentication.',
    'Make calls sequentially. Add up to 1,000 requests per call; a collection holds up to 15,000, or 100 when include_html is used.'
  ]
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'delete', 'clear']).describe('Request operation.'),
      collectionId: z.string().describe('Collection ID from list_collections.'),
      requests: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Provider request objects. Required for add.'),
      requestId: z
        .string()
        .optional()
        .describe('Request ID from list_collection_requests. Required for update and delete.'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider request fields to change. Required for update.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Provider confirmed success.'),
      actionPerformed: z.string().describe('Completed request operation.'),
      collection: z.any().optional().describe('Provider collection state when returned.'),
      request: z.any().optional().describe('Provider updated request fields when returned.')
    })
  )
  .handleInvocation(async ctx => {
    let { action, requests, requestId, parameters } = ctx.input;
    if (!ctx.input.collectionId.trim())
      throw createApiServiceError('Provide collectionId from list_collections.');
    if (action === 'add' && (!requests?.length || requests.length > 1000))
      throw createApiServiceError('Add between 1 and 1,000 requests per call.');
    if ((action === 'update' || action === 'delete') && !requestId?.trim())
      throw createApiServiceError('Provide requestId from list_collection_requests.');
    if (action === 'update' && (!parameters || Object.keys(parameters).length === 0))
      throw createApiServiceError('Provide parameters to update.');
    if (
      [...(requests ?? []), ...(parameters ? [parameters] : [])].some(
        request => 'api_key' in request
      )
    )
      throw createApiServiceError(
        'Omit api_key from request parameters; the connection supplies authentication.'
      );
    let result = await new CountdownClient(ctx.auth).manageCollectionRequests(
      ctx.input.collectionId,
      action,
      requests,
      requestId,
      parameters
    );
    return {
      output: {
        success: result.request_info.success,
        actionPerformed: action,
        collection:
          action === 'add'
            ? requireRecord(result.collection, 'collection')
            : result.collection,
        request:
          action === 'update' ? requireRecord(result.request, 'request') : result.request
      },
      message: `Collection request operation ${action} completed.`
    };
  })
  .build();
