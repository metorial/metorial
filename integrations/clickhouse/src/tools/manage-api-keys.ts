import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { clickhouseServiceError } from '../lib/errors';
import { spec } from '../spec';

let apiKeySchema = z.object({
  keyId: z.string().describe('Unique API key identifier'),
  name: z.string().optional().describe('Name of the API key'),
  state: z.string().optional().describe('Key state (enabled, disabled)'),
  expireAt: z.string().optional().describe('Expiration date of the key'),
  assignedRoles: z
    .array(
      z.object({
        roleId: z.string().optional(),
        roleName: z.string().optional(),
        roleType: z.string().optional()
      })
    )
    .optional()
    .describe('Roles assigned to this key')
});

let ensureBodyHasFields = (body: Record<string, any>, label: string) => {
  if (Object.keys(body).length === 0) {
    throw clickhouseServiceError(`Provide at least one ${label} field to update.`);
  }
};

export let listApiKeys = SlateTool.create(spec, {
  name: 'List API Keys',
  key: 'list_api_keys',
  description: `List all API keys in the organization. Shows key names, states, expiration dates, and assigned roles.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apiKeys: z.array(apiKeySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let keys = await client.listApiKeys();
    let items = Array.isArray(keys) ? keys : [];

    return {
      output: {
        apiKeys: items.map((k: any) => ({
          keyId: k.id,
          name: k.name,
          state: k.state,
          expireAt: k.expireAt,
          assignedRoles: k.assignedRoles
        }))
      },
      message: `Found **${items.length}** API keys.`
    };
  })
  .build();

export let getApiKey = SlateTool.create(spec, {
  name: 'Get API Key',
  key: 'get_api_key',
  description: `Retrieve details for a ClickHouse Cloud API key. The key secret is not returned by the Cloud API after creation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyId: z.string().describe('ID of the API key')
    })
  )
  .output(
    z.object({
      apiKey: z.record(z.string(), z.any()),
      keyId: z.string(),
      name: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let apiKey = await client.getApiKey(ctx.input.keyId);

    return {
      output: {
        apiKey,
        keyId: apiKey.id || ctx.input.keyId,
        name: apiKey.name,
        state: apiKey.state
      },
      message: `Retrieved API key **${apiKey.name || ctx.input.keyId}**.`
    };
  })
  .build();

export let createApiKey = SlateTool.create(spec, {
  name: 'Create API Key',
  key: 'create_api_key',
  description: `Create a new API key for the organization. Specify the key name, permissions/roles, expiration, and optional IP restrictions. The key secret is only returned once — store it securely.`,
  constraints: [
    'Maximum 100 API keys per organization.',
    'The key secret is only returned at creation time and cannot be retrieved later.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the new API key'),
      roles: z
        .array(z.enum(['admin', 'developer', 'query_endpoints']))
        .optional()
        .describe('Deprecated roles to assign (e.g., ["admin"])'),
      assignedRoleIds: z.array(z.string()).optional().describe('Current role IDs to assign'),
      expireAt: z.string().optional().describe('Expiration date in ISO-8601 format'),
      state: z.enum(['enabled', 'disabled']).optional().describe('Initial key state'),
      ipAccessList: z
        .array(
          z.object({
            source: z.string().describe('IP address or CIDR range'),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('IP allow list for the key')
    })
  )
  .output(
    z.object({
      keyId: z.string().describe('ID of the created key'),
      keySecret: z.string().optional().describe('Key secret (only returned once)'),
      name: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.roles) body.roles = ctx.input.roles;
    if (ctx.input.assignedRoleIds) body.assignedRoleIds = ctx.input.assignedRoleIds;
    if (ctx.input.expireAt) body.expireAt = ctx.input.expireAt;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.ipAccessList) body.ipAccessList = ctx.input.ipAccessList;

    let result = await client.createApiKey(body);

    return {
      output: {
        keyId: result.keyId || result.id || result.key?.id,
        keySecret: result.keySecret || result.key?.secret,
        name: result.name || result.key?.name,
        state: result.state || result.key?.state
      },
      message: `API key **${ctx.input.name}** created. Store the key secret securely — it cannot be retrieved later.`
    };
  })
  .build();

export let updateApiKey = SlateTool.create(spec, {
  name: 'Update API Key',
  key: 'update_api_key',
  description: `Update a ClickHouse Cloud API key's name, state, role assignments, expiration, or IP allow list.`
})
  .input(
    z.object({
      keyId: z.string().describe('ID of the API key to update'),
      name: z.string().optional().describe('Updated API key name'),
      assignedRoleIds: z.array(z.string()).optional().describe('Updated role IDs'),
      expireAt: z
        .string()
        .nullable()
        .optional()
        .describe('Updated expiration date in ISO-8601 format, or null to clear'),
      state: z.enum(['enabled', 'disabled']).optional().describe('Updated key state'),
      ipAccessList: z
        .array(
          z.object({
            source: z.string().describe('IP address or CIDR range'),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Updated IP allow list for the key')
    })
  )
  .output(
    z.object({
      apiKey: z.record(z.string(), z.any()),
      keyId: z.string(),
      name: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.assignedRoleIds !== undefined)
      body.assignedRoleIds = ctx.input.assignedRoleIds;
    if (ctx.input.expireAt !== undefined) body.expireAt = ctx.input.expireAt;
    if (ctx.input.state !== undefined) body.state = ctx.input.state;
    if (ctx.input.ipAccessList !== undefined) body.ipAccessList = ctx.input.ipAccessList;
    ensureBodyHasFields(body, 'API key');

    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let apiKey = await client.updateApiKey(ctx.input.keyId, body);

    return {
      output: {
        apiKey,
        keyId: apiKey.id || ctx.input.keyId,
        name: apiKey.name,
        state: apiKey.state
      },
      message: `Updated API key **${apiKey.name || ctx.input.keyId}**.`
    };
  })
  .build();

export let deleteApiKey = SlateTool.create(spec, {
  name: 'Delete API Key',
  key: 'delete_api_key',
  description: `Permanently delete an API key. The key used to authenticate the current request cannot be deleted.`,
  constraints: [
    'Cannot delete the key used to authenticate the current request.',
    'Deletion is permanent and cannot be undone.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      keyId: z.string().describe('ID of the API key to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteApiKey(ctx.input.keyId);

    return {
      output: { deleted: true },
      message: `API key **${ctx.input.keyId}** permanently deleted.`
    };
  })
  .build();
