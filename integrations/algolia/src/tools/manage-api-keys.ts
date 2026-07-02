import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageApiKeys = SlateTool.create(spec, {
  name: 'Manage API Keys',
  key: 'manage_api_keys',
  description: `List, get, create, update, delete, or restore Algolia API keys. Manage access control for your Algolia application by creating keys with specific permissions, rate limits, and restrictions.`,
  tags: {
    destructive: true
  },
  instructions: [
    'Use action "list" to retrieve all API keys for the application.',
    'Use action "get" with a keyValue to retrieve details of a specific API key.',
    'Use action "create" to create a new API key. You must provide at least the acl array specifying permissions.',
    'Use action "update" with a keyValue to modify an existing API key.',
    'Use action "delete" with a keyValue to permanently delete an API key.',
    'Use action "restore" with a keyValue to restore a previously deleted API key.',
    'Common ACL permissions: search, browse, addObject, deleteObject, editSettings, listIndexes, deleteIndex, analytics, recommendation, usage, logs, seeUnretrievableAttributes.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'restore'])
        .describe('The action to perform on API keys'),
      keyValue: z
        .string()
        .optional()
        .describe(
          'The API key string. Required for get, update, delete, and restore actions.'
        ),
      acl: z
        .array(z.string())
        .optional()
        .describe(
          'List of permissions for the key (e.g. "search", "browse", "addObject", "deleteObject", "editSettings", "listIndexes"). Required for create, optional for update.'
        ),
      indices: z
        .array(z.string())
        .optional()
        .describe(
          'List of index names this key can access. If empty or not provided, the key can access all indices.'
        ),
      maxHitsPerQuery: z
        .number()
        .optional()
        .describe(
          'Maximum number of hits this API key can retrieve in one query. Use 0 for unlimited.'
        ),
      maxQueriesPerIPPerHour: z
        .number()
        .optional()
        .describe(
          'Maximum number of API calls allowed from a given IP address per hour. Use 0 for unlimited.'
        ),
      validity: z
        .number()
        .optional()
        .describe('Validity duration of the key in seconds. 0 means the key never expires.'),
      description: z
        .string()
        .optional()
        .describe('A human-readable description of the API key.'),
      referers: z
        .array(z.string())
        .optional()
        .describe(
          'List of allowed HTTP referers. Supports wildcards, e.g. "https://example.com/*".'
        ),
      queryParameters: z
        .string()
        .optional()
        .describe(
          'URL-encoded query parameters to force with every search request made with this key, e.g. "typoTolerance=strict&ignorePlurals=false".'
        )
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { action, keyValue } = ctx.input;

    if (action === 'list') {
      let result = await client.listApiKeys();

      return {
        output: result,
        message: `Listed all API keys for the application`
      };
    }

    if (action === 'get') {
      if (!keyValue) {
        throw new Error('keyValue is required for the "get" action.');
      }

      let result = await client.getApiKey(keyValue);

      return {
        output: result,
        message: `Retrieved details for API key **${keyValue.slice(0, 8)}...**`
      };
    }

    if (action === 'create') {
      if (!ctx.input.acl || ctx.input.acl.length === 0) {
        throw new Error('acl is required and must not be empty when creating an API key.');
      }

      let params: Record<string, any> = {
        acl: ctx.input.acl
      };

      if (ctx.input.indices) params.indexes = ctx.input.indices;
      if (ctx.input.maxHitsPerQuery !== undefined)
        params.maxHitsPerQuery = ctx.input.maxHitsPerQuery;
      if (ctx.input.maxQueriesPerIPPerHour !== undefined)
        params.maxQueriesPerIPPerHour = ctx.input.maxQueriesPerIPPerHour;
      if (ctx.input.validity !== undefined) params.validity = ctx.input.validity;
      if (ctx.input.description !== undefined) params.description = ctx.input.description;
      if (ctx.input.referers) params.referers = ctx.input.referers;
      if (ctx.input.queryParameters !== undefined)
        params.queryParameters = ctx.input.queryParameters;

      let result = await client.createApiKey(params);

      return {
        output: result,
        message: `Created new API key with permissions: ${ctx.input.acl.join(', ')}`
      };
    }

    if (action === 'update') {
      if (!keyValue) {
        throw new Error('keyValue is required for the "update" action.');
      }

      let params: Record<string, any> = {};

      if (ctx.input.acl) params.acl = ctx.input.acl;
      if (ctx.input.indices) params.indexes = ctx.input.indices;
      if (ctx.input.maxHitsPerQuery !== undefined)
        params.maxHitsPerQuery = ctx.input.maxHitsPerQuery;
      if (ctx.input.maxQueriesPerIPPerHour !== undefined)
        params.maxQueriesPerIPPerHour = ctx.input.maxQueriesPerIPPerHour;
      if (ctx.input.validity !== undefined) params.validity = ctx.input.validity;
      if (ctx.input.description !== undefined) params.description = ctx.input.description;
      if (ctx.input.referers) params.referers = ctx.input.referers;
      if (ctx.input.queryParameters !== undefined)
        params.queryParameters = ctx.input.queryParameters;

      if (Object.keys(params).length === 0) {
        throw new Error('At least one field must be provided when updating an API key.');
      }

      let result = await client.updateApiKey(keyValue, params);

      return {
        output: result,
        message: `Updated API key **${keyValue.slice(0, 8)}...**`
      };
    }

    if (action === 'delete') {
      if (!keyValue) {
        throw new Error('keyValue is required for the "delete" action.');
      }

      let result = await client.deleteApiKey(keyValue);

      return {
        output: result,
        message: `Deleted API key **${keyValue.slice(0, 8)}...**`
      };
    }

    // action === 'restore'
    if (!keyValue) {
      throw new Error('keyValue is required for the "restore" action.');
    }

    let result = await client.restoreApiKey(keyValue);

    return {
      output: result,
      message: `Restored API key **${keyValue.slice(0, 8)}...**`
    };
  })
  .build();
