import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, jsonApiBody, relationshipData, singleData } from '../lib/envelopes';
import { paginationInputFields } from '../lib/pagination';
import { requireConfirm, requireIdempotencyKey } from '../lib/validation';
import { spec } from '../spec';
import {
  confirmSchema,
  idempotencyKeySchema,
  rawRecordArraySchema,
  rawRecordSchema
} from './schemas';
import {
  attributesBody,
  countOf,
  createClient,
  deleteOutput,
  listRawResult,
  resourceResult,
  summaryListMessage
} from './shared';

const apiScopeSchema = z.enum([
  'party.read',
  'party.update',
  'invite.read',
  'invite.create',
  'invite.update',
  'invite.delete',
  'membership.create',
  'membership.read',
  'membership.update',
  'membership.delete',
  'payments.create',
  'payments.read',
  'wallets.read',
  'wallets.create',
  'wallets.update',
  'wallets.delete',
  'wallets.fund',
  'wallets.withdraw',
  'delegations.read',
  'delegations.create',
  'delegations.update',
  'delegations.delete',
  'api_keys.read',
  'api_keys.create',
  'api_keys.delete',
  'agents.read',
  'agents.create',
  'agents.update',
  'agents.delete',
  'disputes.read',
  'disputes.create'
]);

const keyResourceOutput = <
  IdKey extends string,
  ResourceKey extends string,
  SecretOutputKey extends 'apiKey' | 'agentKey'
>(
  envelope: unknown,
  idKey: IdKey,
  resourceKey: ResourceKey,
  secretAttribute: 'apiKey' | 'agentKey',
  secretOutputKey: SecretOutputKey
) => {
  const base = resourceResult(envelope, idKey, resourceKey);
  const attributes = attributesOf(singleData(envelope));

  return {
    ...base,
    [secretOutputKey]:
      typeof attributes[secretAttribute] === 'string' ? attributes[secretAttribute] : undefined
  } as typeof base & Record<SecretOutputKey, string | undefined>;
};

export const listApiKeys = SlateTool.create(spec, {
  name: 'List API Keys',
  key: 'list_api_keys',
  description: 'List Natural party API keys. Secrets are not returned by this list endpoint.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      status: z.enum(['ACTIVE', 'REVOKED']).optional().describe('API key status filter.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      apiKeys: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list api keys', 'get', '/api-keys', {
      params: {
        status: ctx.input.status,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    const output = listRawResult(envelope, 'apiKeys');

    return {
      output,
      message: summaryListMessage(countOf(output, 'apiKeys'), 'API keys')
    };
  })
  .build();

export const createApiKey = SlateTool.create(spec, {
  name: 'Create API Key',
  key: 'create_api_key',
  description:
    'Create a Natural party API key and return the one-time key secret in output.apiKey. Requires confirmation.',
  constraints: ['The API key secret is returned only once and cannot be retrieved later.']
})
  .input(
    z.object({
      name: z.string().min(1).max(100).describe('Human-readable key name.'),
      scopes: z.array(apiScopeSchema).min(1).optional().describe('Optional API key scopes.'),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      apiKey: z.string().optional().describe('One-time Natural API key secret.'),
      key: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'create this API key');
    const client = createClient(ctx);
    const envelope = await client.request('create api key', 'post', '/api-keys', {
      body: jsonApiBody(
        attributesBody({
          name: ctx.input.name,
          scopes: ctx.input.scopes
        })
      )
    });

    return {
      output: keyResourceOutput(envelope, 'keyId', 'key', 'apiKey', 'apiKey'),
      message: `Created API key **${ctx.input.name}**. Store the returned secret securely.`
    };
  })
  .build();

export const getApiKey = SlateTool.create(spec, {
  name: 'Get API Key',
  key: 'get_api_key',
  description: 'Retrieve Natural API key metadata. The key secret is not returned.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      keyId: z.string().min(1).describe('Natural API key ID.')
    })
  )
  .output(
    z.object({
      keyId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      key: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get api key',
      'get',
      `/api-keys/${ctx.input.keyId}`
    );

    return {
      output: resourceResult(envelope, 'keyId', 'key'),
      message: `Retrieved API key **${ctx.input.keyId}**.`
    };
  })
  .build();

export const revokeApiKey = SlateTool.create(spec, {
  name: 'Revoke API Key',
  key: 'revoke_api_key',
  description: 'Revoke a Natural API key.',
  tags: { destructive: true }
})
  .input(
    z.object({
      keyId: z.string().min(1).describe('Natural API key ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      key: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this API key');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an API key');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke api key',
      'delete',
      `/api-keys/${ctx.input.keyId}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'keyId', 'key'),
      message: `Revoked API key **${ctx.input.keyId}**.`
    };
  })
  .build();

export const listAgentKeys = SlateTool.create(spec, {
  name: 'List Agent Keys',
  key: 'list_agent_keys',
  description: 'List Natural agent keys. Secrets are not returned by this list endpoint.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      agentId: z.string().optional().describe('Filter by Natural agent ID.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      agentKeys: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list agent keys', 'get', '/agent-keys', {
      params: {
        agentId: ctx.input.agentId,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    const output = listRawResult(envelope, 'agentKeys');

    return {
      output,
      message: summaryListMessage(countOf(output, 'agentKeys'), 'agent keys')
    };
  })
  .build();

export const createAgentKey = SlateTool.create(spec, {
  name: 'Create Agent Key',
  key: 'create_agent_key',
  description:
    'Create a Natural agent key and return the one-time key secret in output.agentKey. Requires confirmation.',
  constraints: ['The agent key secret is returned only once and cannot be retrieved later.']
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID to bind the key to.'),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      agentKey: z.string().optional().describe('One-time Natural agent key secret.'),
      key: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'create this agent key');
    const client = createClient(ctx);
    const envelope = await client.request('create agent key', 'post', '/agent-keys', {
      body: jsonApiBody({}, { agent: relationshipData('agent', ctx.input.agentId) })
    });

    return {
      output: keyResourceOutput(envelope, 'keyId', 'key', 'agentKey', 'agentKey'),
      message: `Created agent key for agent **${ctx.input.agentId}**. Store the returned secret securely.`
    };
  })
  .build();

export const revokeAgentKey = SlateTool.create(spec, {
  name: 'Revoke Agent Key',
  key: 'revoke_agent_key',
  description: 'Revoke a Natural agent key.',
  tags: { destructive: true }
})
  .input(
    z.object({
      keyId: z.string().min(1).describe('Natural agent key ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      key: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this agent key');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an agent key');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke agent key',
      'delete',
      `/agent-keys/${ctx.input.keyId}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'keyId', 'key'),
      message: `Revoked agent key **${ctx.input.keyId}**.`
    };
  })
  .build();
