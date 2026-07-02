import { SlateTool } from 'slates';
import { z } from 'zod';
import * as iam from '../lib/iam';
import { spec } from '../spec';

export let listServiceAccounts = SlateTool.create(spec, {
  name: 'List Service Accounts',
  key: 'list_service_accounts',
  description: `List IAM service accounts in a folder. Service accounts are used for programmatic access to Yandex Cloud resources.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list service accounts from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      serviceAccounts: z
        .array(
          z.object({
            serviceAccountId: z.string().describe('Service account ID'),
            name: z.string().optional().describe('Service account name'),
            description: z.string().optional().describe('Service account description'),
            folderId: z.string().optional().describe('Folder ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of service accounts'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await iam.listServiceAccounts(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let accounts = (result.serviceAccounts || []).map((sa: any) => ({
      serviceAccountId: sa.id,
      name: sa.name,
      description: sa.description,
      folderId: sa.folderId,
      createdAt: sa.createdAt
    }));

    return {
      output: {
        serviceAccounts: accounts,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${accounts.length} service account(s) in folder ${folderId}.`
    };
  })
  .build();

export let manageServiceAccount = SlateTool.create(spec, {
  name: 'Manage Service Account',
  key: 'manage_service_account',
  description: `Create or delete IAM service accounts. Service accounts allow automated programmatic access to Yandex Cloud resources with scoped permissions.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      serviceAccountId: z
        .string()
        .optional()
        .describe('ID of the service account (required for delete)'),
      folderId: z.string().optional().describe('Folder ID (required for create)'),
      name: z.string().optional().describe('Service account name (required for create)'),
      description: z.string().optional().describe('Service account description')
    })
  )
  .output(
    z.object({
      operationId: z.string().optional().describe('Operation ID'),
      serviceAccountId: z.string().optional().describe('Service account ID'),
      done: z.boolean().optional().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      let folderId = ctx.input.folderId || ctx.config.folderId;
      if (!folderId) throw new Error('folderId is required for service account creation');
      if (!ctx.input.name) throw new Error('name is required for service account creation');

      let result = await iam.createServiceAccount(ctx.auth, {
        folderId,
        name: ctx.input.name,
        description: ctx.input.description
      });

      return {
        output: {
          operationId: result.id,
          serviceAccountId: result.metadata?.serviceAccountId,
          done: result.done || false
        },
        message: `Service account **${ctx.input.name}** creation initiated.`
      };
    } else {
      if (!ctx.input.serviceAccountId)
        throw new Error('serviceAccountId is required for deletion');

      let result = await iam.deleteServiceAccount(ctx.auth, ctx.input.serviceAccountId);

      return {
        output: {
          operationId: result.id,
          done: result.done || false
        },
        message: `Service account **${ctx.input.serviceAccountId}** deletion initiated.`
      };
    }
  })
  .build();

export let manageApiKeys = SlateTool.create(spec, {
  name: 'Manage API Keys',
  key: 'manage_api_keys',
  description: `List, create, or delete API keys for a service account. API keys provide simplified, non-expiring authentication for service accounts.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      serviceAccountId: z
        .string()
        .optional()
        .describe('Service account ID (required for list and create)'),
      apiKeyId: z.string().optional().describe('API key ID (required for delete)'),
      description: z.string().optional().describe('Description for the new API key'),
      scopes: z.array(z.string()).optional().describe('Scopes to restrict the API key to')
    })
  )
  .output(
    z.object({
      apiKeys: z
        .array(
          z.object({
            apiKeyId: z.string().describe('API key ID'),
            serviceAccountId: z.string().optional().describe('Service account ID'),
            description: z.string().optional().describe('API key description'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of API keys'),
      apiKeyId: z.string().optional().describe('Created or deleted API key ID'),
      secret: z
        .string()
        .optional()
        .describe('Secret part of the API key (only returned on creation)')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'list') {
      if (!ctx.input.serviceAccountId)
        throw new Error('serviceAccountId is required for listing API keys');

      let result = await iam.listApiKeys(ctx.auth, ctx.input.serviceAccountId);
      let keys = (result.apiKeys || []).map((k: any) => ({
        apiKeyId: k.id,
        serviceAccountId: k.serviceAccountId,
        description: k.description,
        createdAt: k.createdAt
      }));

      return {
        output: { apiKeys: keys },
        message: `Found ${keys.length} API key(s) for service account ${ctx.input.serviceAccountId}.`
      };
    } else if (ctx.input.action === 'create') {
      if (!ctx.input.serviceAccountId)
        throw new Error('serviceAccountId is required for creating API keys');

      let result = await iam.createApiKey(ctx.auth, {
        serviceAccountId: ctx.input.serviceAccountId,
        description: ctx.input.description,
        scopes: ctx.input.scopes
      });

      return {
        output: {
          apiKeyId: result.apiKey?.id,
          secret: result.secret
        },
        message: `API key created for service account **${ctx.input.serviceAccountId}**. Save the secret — it won't be shown again.`
      };
    } else {
      if (!ctx.input.apiKeyId) throw new Error('apiKeyId is required for deletion');

      await iam.deleteApiKey(ctx.auth, ctx.input.apiKeyId);

      return {
        output: { apiKeyId: ctx.input.apiKeyId },
        message: `API key **${ctx.input.apiKeyId}** deleted.`
      };
    }
  })
  .build();
