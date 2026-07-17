import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, jsonApiBody, relationshipData, singleData } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
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

const isUriEncodable = (value: string) => {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const agentKeyRelationshipSchema = (type: 'party' | 'agent') =>
  z
    .object({
      data: z
        .object({
          type: z.literal(type),
          id: z.string().min(1)
        })
        .passthrough()
    })
    .passthrough();

const agentKeyCreateSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('agentKey'),
        id: z.string().min(1),
        attributes: z
          .object({
            agentKeyPrefix: z.string().min(1),
            status: z.string().min(1),
            createdAt: z.string().datetime({ offset: true }),
            lastUsedAt: z.string().datetime({ offset: true }).nullable(),
            revokedAt: z.string().datetime({ offset: true }).nullable(),
            createdBy: z.string().nullable(),
            revokedBy: z.string().nullable(),
            expiresAt: z.string().datetime({ offset: true }).nullable(),
            agentKey: z.string().min(1)
          })
          .passthrough(),
        relationships: z
          .object({
            party: agentKeyRelationshipSchema('party'),
            agent: agentKeyRelationshipSchema('agent')
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

const agentKeyIdSchema = z
  .string()
  .min(5, 'Agent key IDs require a non-empty value after agk_.')
  .startsWith('agk_', 'Agent key IDs use the agk_ prefix.')
  .refine(isUriEncodable, 'Natural agent key ID must be well-formed Unicode.');

const agentKeyRevokeSuccessSchema = z
  .object({
    data: z
      .object({
        id: z.string().min(1),
        type: z.literal('agentKey'),
        attributes: z
          .object({
            agentKeyPrefix: z.string().min(1),
            status: z.literal('REVOKED'),
            createdAt: z.string().datetime({ offset: true }),
            lastUsedAt: z.string().datetime({ offset: true }).nullable(),
            revokedAt: z.string().datetime({ offset: true }).nullable(),
            createdBy: z.string().nullable(),
            revokedBy: z.string().nullable(),
            expiresAt: z.string().datetime({ offset: true }).nullable()
          })
          .passthrough(),
        relationships: z
          .object({
            party: agentKeyRelationshipSchema('party'),
            agent: agentKeyRelationshipSchema('agent')
          })
          .passthrough()
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.literal(true)
      })
      .passthrough()
  })
  .passthrough();

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
  const resource = singleData(envelope);
  const attributes = attributesOf(resource);
  const safeAttributes = Object.fromEntries(
    Object.entries(attributes).filter(([name]) => name !== secretAttribute)
  );
  const safeResource = Object.fromEntries(
    Object.entries(resource).filter(([name]) => name !== secretAttribute)
  );
  safeResource.attributes = safeAttributes;
  const base = resourceResult({ data: safeResource }, idKey, resourceKey);

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
      scopes: z
        .array(z.enum([...apiScopeSchema.options, 'external_accounts.create']))
        .min(1)
        .optional()
        .describe(
          'Optional least-privilege API key scopes. If omitted, Natural grants its default full scope set.'
        ),
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
  description:
    'Retrieve non-secret metadata for a Natural API key by its apy_* ID, including its name, status, scopes, prefix, environment, and lifecycle timestamps. The key secret is never returned.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      keyId: z
        .string()
        .min(5)
        .startsWith('apy_')
        .refine(isUriEncodable, 'Natural API key ID must be well-formed Unicode.')
        .describe('Natural API key ID with the documented apy_ prefix.')
    })
  )
  .output(
    z.object({
      keyId: z.string().optional().describe('Natural API key ID (apy_*).'),
      type: z.string().optional().describe('Natural resource type.'),
      name: z.string().optional().describe('Human-readable API key name.'),
      status: z.string().optional().describe('Current API key status.'),
      scopes: z.array(z.string()).optional().describe('Scopes authorized for this API key.'),
      apiKeyPrefix: z
        .string()
        .optional()
        .describe('Non-secret prefix that identifies the API key.'),
      environment: z.string().optional().describe('Natural environment for the API key.'),
      createdAt: z.string().optional().describe('When the API key was created.'),
      lastUsedAt: z
        .string()
        .nullable()
        .optional()
        .describe('When the API key was last used, or null if it has not been used.'),
      revokedAt: z
        .string()
        .nullable()
        .optional()
        .describe('When the API key was revoked, or null if it is active.'),
      key: rawRecordSchema.describe(
        'Raw non-secret Natural API key resource, including relationships and additive metadata.'
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get api key',
      'get',
      `/api-keys/${encodeURIComponent(ctx.input.keyId)}`
    );
    const resource = singleData(envelope);
    const attributes = attributesOf(resource);
    const safeAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([name]) => name !== 'apiKey')
    );
    const safeResource = Object.fromEntries(
      Object.entries(resource).filter(([name]) => name !== 'apiKey')
    );
    safeResource.attributes = safeAttributes;

    return {
      output: {
        ...resourceResult({ data: safeResource }, 'keyId', 'key'),
        name: typeof attributes.name === 'string' ? attributes.name : undefined,
        scopes: Array.isArray(attributes.scopes)
          ? attributes.scopes.filter((scope): scope is string => typeof scope === 'string')
          : undefined,
        apiKeyPrefix:
          typeof attributes.apiKeyPrefix === 'string' ? attributes.apiKeyPrefix : undefined,
        environment:
          typeof attributes.environment === 'string' ? attributes.environment : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        lastUsedAt:
          typeof attributes.lastUsedAt === 'string' || attributes.lastUsedAt === null
            ? attributes.lastUsedAt
            : undefined,
        revokedAt:
          typeof attributes.revokedAt === 'string' || attributes.revokedAt === null
            ? attributes.revokedAt
            : undefined
      },
      message: `Retrieved API key **${ctx.input.keyId}**.`
    };
  })
  .build();

export const revokeApiKey = SlateTool.create(spec, {
  name: 'Revoke API Key',
  key: 'revoke_api_key',
  description:
    'Revoke a Natural API key by ID so it can no longer authenticate. Requires confirmation and an idempotency key; reuse the same key when retrying the same revocation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      keyId: z
        .string()
        .min(5)
        .startsWith('apy_')
        .refine(isUriEncodable, 'Natural API key ID must be well-formed Unicode.')
        .describe('Natural API key ID with the documented apy_ prefix.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().optional().describe('Revoked Natural API key ID.'),
      type: z.string().optional().describe('Natural resource type.'),
      status: z.string().optional().describe('Revoked API key status.'),
      key: rawRecordSchema.describe(
        'Raw non-secret Natural API key resource returned after revocation.'
      ),
      deleted: z.boolean().describe('Whether Natural confirmed the API key was revoked.')
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this API key');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an API key');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke api key',
      'delete',
      `/api-keys/${encodeURIComponent(ctx.input.keyId)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const output = deleteOutput(envelope, 'keyId', 'key');
    const safeAttributes = Object.fromEntries(
      Object.entries(attributesOf(output.key)).filter(([name]) => name !== 'apiKey')
    );
    const safeKey = Object.fromEntries(
      Object.entries(output.key).filter(([name]) => name !== 'apiKey')
    );
    safeKey.attributes = safeAttributes;

    return {
      output: {
        ...output,
        key: safeKey
      },
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
      agentId: z.string().min(1).optional().describe('Filter by Natural agent ID.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      agentKeys: rawRecordArraySchema.describe(
        'Raw non-secret Natural agent key resources, including IDs, status, prefixes, lifecycle timestamps, and agent and party relationships.'
      ),
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
    const rawOutput = listRawResult(envelope, 'agentKeys');
    const agentKeys = rawOutput.agentKeys.map(resource => {
      const safeAttributes = Object.fromEntries(
        Object.entries(attributesOf(resource)).filter(([name]) => name !== 'agentKey')
      );
      const safeResource = Object.fromEntries(
        Object.entries(resource).filter(([name]) => name !== 'agentKey')
      );
      safeResource.attributes = safeAttributes;
      return safeResource;
    });
    const output = { ...rawOutput, agentKeys };

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
    'Create a Natural agent key bound to an existing agent and return its lifecycle and ownership metadata plus the one-time secret only in output.agentKey. Requires confirmation.',
  constraints: [
    'The agent key secret is returned only once and cannot be retrieved later.',
    'Natural does not accept a custom name or expiration when creating an agent key.',
    'Creating a replacement key does not revoke existing keys; revoke the old key after any intended overlap.'
  ]
})
  .input(
    z.object({
      agentId: z
        .string()
        .min(5)
        .startsWith('agt_')
        .refine(isUriEncodable, 'Natural agent ID must be well-formed Unicode.')
        .describe(
          'Existing Natural agent ID to bind the key to. IDs are opaque strings in the agt_* family.'
        ),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().min(1).describe('Created Natural agent key ID (agk_*).'),
      type: z.literal('agentKey').describe('Natural resource type.'),
      status: z.string().min(1).describe('Current agent key status.'),
      agentKeyPrefix: z
        .string()
        .min(1)
        .describe('Non-secret prefix that identifies the agent key.'),
      createdAt: z
        .string()
        .datetime({ offset: true })
        .describe('When the agent key was created.'),
      lastUsedAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('When the agent key was last used, or null if it has not been used.'),
      revokedAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('When the agent key was revoked, or null while it is active.'),
      createdBy: z
        .string()
        .nullable()
        .describe('Natural user ID that created the agent key, when available.'),
      revokedBy: z
        .string()
        .nullable()
        .describe('Natural user ID that revoked the agent key, or null while active.'),
      expiresAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('Scheduled expiration time, or null when the key does not expire.'),
      partyId: z.string().min(1).describe('Natural party ID that owns the agent key.'),
      agentId: z
        .string()
        .min(5)
        .startsWith('agt_')
        .describe('Natural agent ID the key is bound to.'),
      relationships: rawRecordSchema.describe('Raw Natural relationship metadata.'),
      agentKey: z.string().min(1).describe('One-time Natural agent key secret.'),
      key: rawRecordSchema.describe(
        'Raw non-secret Natural agent key resource, including relationships and additive metadata.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'create this agent key');
    const client = createClient(ctx);
    const envelope = await client.request('create agent key', 'post', '/agent-keys', {
      body: jsonApiBody({}, { agent: relationshipData('agent', ctx.input.agentId) })
    });
    const response = agentKeyCreateSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when creating an agent key. Verify agent key state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }

    const resource = response.data.data;
    const { attributes, relationships } = resource;
    const party = relationships.party.data;
    const agent = relationships.agent.data;
    if (agent.id !== ctx.input.agentId) {
      throw naturalServiceError(
        'Natural returned an agent key bound to a different agent than requested. Verify agent key state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }

    const safeAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key !== 'agentKey')
    );
    const safeKey = Object.fromEntries(
      Object.entries(resource).filter(([key]) => key !== 'agentKey')
    );
    safeKey.attributes = safeAttributes;

    return {
      output: {
        keyId: resource.id,
        type: resource.type,
        status: attributes.status,
        agentKeyPrefix: attributes.agentKeyPrefix,
        createdAt: attributes.createdAt,
        lastUsedAt: attributes.lastUsedAt,
        revokedAt: attributes.revokedAt,
        createdBy: attributes.createdBy,
        revokedBy: attributes.revokedBy,
        expiresAt: attributes.expiresAt,
        partyId: party.id,
        agentId: agent.id,
        relationships,
        agentKey: attributes.agentKey,
        key: safeKey
      },
      message: `Created agent key for agent **${ctx.input.agentId}**. Store the returned secret securely.`
    };
  })
  .build();

export const revokeAgentKey = SlateTool.create(spec, {
  name: 'Revoke Agent Key',
  key: 'revoke_agent_key',
  description:
    'Revoke a Natural agent key by its agk_* ID so it can no longer authenticate. Other active keys for the same agent keep working. Requires confirmation and an idempotency key; reuse the same key when retrying the same revocation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      keyId: agentKeyIdSchema.describe(
        'Natural agent key ID with an agk_ prefix and non-empty opaque suffix.'
      ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      keyId: z.string().min(1).describe('Revoked Natural agent key ID.'),
      type: z.literal('agentKey').describe('Natural resource type.'),
      status: z.literal('REVOKED').describe('Revoked agent key status.'),
      key: rawRecordSchema.describe(
        'Raw non-secret Natural agent key resource returned after revocation, including relationships and additive metadata.'
      ),
      deleted: z.literal(true).describe('Natural confirmed the agent key was revoked.'),
      meta: rawRecordSchema.describe(
        'Raw Natural response metadata, preserving deletion confirmation and additive fields.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this agent key');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an agent key');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke agent key',
      'delete',
      `/agent-keys/${encodeURIComponent(ctx.input.keyId)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = agentKeyRevokeSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when revoking an agent key. Verify agent key state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.keyId) {
      throw naturalServiceError(
        'Natural returned a different agent key than the one requested when revoking it. Verify agent key state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const { data: key, meta } = response.data;
    const safeAttributes = Object.fromEntries(
      Object.entries(key.attributes).filter(([name]) => name !== 'agentKey')
    );
    const safeKey = Object.fromEntries(
      Object.entries(key).filter(([name]) => name !== 'agentKey')
    );
    safeKey.attributes = safeAttributes;

    return {
      output: {
        keyId: key.id,
        type: key.type,
        status: key.attributes.status,
        key: safeKey,
        deleted: meta.deleted,
        meta
      },
      message: `Revoked agent key **${ctx.input.keyId}**.`
    };
  })
  .build();
