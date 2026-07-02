import { SlateTool } from 'slates';
import { z } from 'zod';
import { jsonApiBody } from '../lib/envelopes';
import { paginationInputFields } from '../lib/pagination';
import {
  ensureAtLeastOneField,
  limitsObject,
  recipientObject,
  requireConfirm,
  requireIdempotencyKey
} from '../lib/validation';
import { spec } from '../spec';
import {
  confirmSchema,
  idempotencyKeySchema,
  limitsSchema,
  perTransactionLimitsSchema,
  rawRecordArraySchema,
  rawRecordSchema,
  recipientSchema
} from './schemas';
import {
  attributesBody,
  countOf,
  createClient,
  deleteOutput,
  listRawResult,
  metaArray,
  resourceResult,
  summaryListMessage
} from './shared';

const agentOutputSchema = z.object({
  agentId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  agent: rawRecordSchema
});

const agentListOutputSchema = z.object({
  agents: rawRecordArraySchema,
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable()
  })
});

const invitationStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELED'
]);

export const listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: 'List Natural agents with optional status filtering and cursor pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      status: z.enum(['ACTIVE', 'REVOKED']).optional().describe('Agent status filter.'),
      ...paginationInputFields
    })
  )
  .output(agentListOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list agents', 'get', '/agents', {
      params: {
        status: ctx.input.status,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    });
    const output = listRawResult(envelope, 'agents');

    return {
      output,
      message: summaryListMessage(countOf(output, 'agents'), 'agents')
    };
  })
  .build();

export const createAgent = SlateTool.create(spec, {
  name: 'Create Agent',
  key: 'create_agent',
  description:
    'Create a Natural agent. Provide an idempotency key and reuse that same key if retrying this creation.'
})
  .input(
    z.object({
      name: z.string().min(1).max(100).describe('Agent display name.'),
      description: z.string().optional().describe('Agent description.'),
      limits: limitsSchema,
      walletId: z.string().optional().describe('Default wallet ID for the agent.'),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(agentOutputSchema)
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'create an agent');
    const client = createClient(ctx);
    const envelope = await client.request('create agent', 'post', '/agents', {
      idempotencyKey: ctx.input.idempotencyKey,
      body: jsonApiBody(
        attributesBody({
          name: ctx.input.name,
          description: ctx.input.description,
          limits: limitsObject(ctx.input.limits),
          walletId: ctx.input.walletId
        })
      )
    });
    const output = resourceResult(envelope, 'agentId', 'agent');

    return {
      output,
      message: `Created Natural agent **${ctx.input.name}**.`
    };
  })
  .build();

export const getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description:
    'Retrieve a Natural agent by ID, including status, limits, and party relationship.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID.')
    })
  )
  .output(agentOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('get agent', 'get', `/agents/${ctx.input.agentId}`);

    return {
      output: resourceResult(envelope, 'agentId', 'agent'),
      message: `Retrieved agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const updateAgent = SlateTool.create(spec, {
  name: 'Update Agent',
  key: 'update_agent',
  description:
    'Update a Natural agent. Limit updates replace supplied limit fields; null clears the corresponding cap.'
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID.'),
      name: z
        .string()
        .min(1)
        .max(100)
        .nullable()
        .optional()
        .describe('Updated name, or null to clear.'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('Updated description, or null to clear.'),
      limits: limitsSchema
        .nullable()
        .optional()
        .describe('Updated limits object, or null to clear all limits.'),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(agentOutputSchema)
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'update an agent');

    const body = attributesBody({
      name: ctx.input.name,
      description: ctx.input.description,
      limits:
        ctx.input.limits === undefined
          ? undefined
          : ctx.input.limits === null
            ? null
            : limitsObject(ctx.input.limits)
    });
    ensureAtLeastOneField(body, 'agent update');

    const client = createClient(ctx);
    const envelope = await client.request(
      'update agent',
      'patch',
      `/agents/${ctx.input.agentId}`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody(body)
      }
    );

    return {
      output: resourceResult(envelope, 'agentId', 'agent'),
      message: `Updated agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const deleteAgent = SlateTool.create(spec, {
  name: 'Delete Agent',
  key: 'delete_agent',
  description: 'Delete or revoke a Natural agent by ID.',
  tags: { destructive: true }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      agentId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      agent: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'delete this agent');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'delete an agent');
    const client = createClient(ctx);
    const envelope = await client.request(
      'delete agent',
      'delete',
      `/agents/${ctx.input.agentId}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'agentId', 'agent'),
      message: `Deleted agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const listAgentCustomers = SlateTool.create(spec, {
  name: 'List Agent Customers',
  key: 'list_agent_customers',
  description: 'List customers delegated to a Natural agent.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      customers: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list agent customers',
      'get',
      `/agents/${ctx.input.agentId}/customers`,
      {
        params: {
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const output = listRawResult(envelope, 'customers');

    return {
      output,
      message: summaryListMessage(countOf(output, 'customers'), 'agent customers')
    };
  })
  .build();

export const inviteAgentCustomer = SlateTool.create(spec, {
  name: 'Invite Agent Customer',
  key: 'invite_agent_customer',
  description:
    'Invite one or more customers to delegate access to a Natural agent with specific permissions and optional limits.'
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID.'),
      recipients: z.array(recipientSchema).min(1).describe('Customer recipients to invite.'),
      permissions: z.array(z.string().min(1)).min(1).describe('Natural permission strings.'),
      limits: perTransactionLimitsSchema,
      expiresAt: z.string().optional().describe('Invitation expiration timestamp.'),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(
    z.object({
      invitations: rawRecordArraySchema,
      emailFailures: z.array(z.any())
    })
  )
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'invite agent customers');
    const client = createClient(ctx);
    const envelope = await client.request(
      'invite agent customer',
      'post',
      `/agents/${ctx.input.agentId}/customers`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody(
          attributesBody({
            recipients: ctx.input.recipients.map(recipientObject),
            permissions: ctx.input.permissions,
            limits: ctx.input.limits,
            expiresAt: ctx.input.expiresAt
          })
        )
      }
    );
    const invitations = Array.isArray((envelope as any)?.data) ? (envelope as any).data : [];

    return {
      output: {
        invitations,
        emailFailures: metaArray(envelope, 'emailFailures')
      },
      message: `Created **${invitations.length}** agent customer invitations.`
    };
  })
  .build();

export const revokeAgentCustomer = SlateTool.create(spec, {
  name: 'Revoke Agent Customer',
  key: 'revoke_agent_customer',
  description: 'Revoke a customer delegation from a Natural agent.',
  tags: { destructive: true }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID.'),
      customerId: z.string().min(1).describe('Natural customer ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      customerId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      customer: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this agent customer');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an agent customer');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke agent customer',
      'delete',
      `/agents/${ctx.input.agentId}/customers/${ctx.input.customerId}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'customerId', 'customer'),
      message: `Revoked customer **${ctx.input.customerId}** from agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const listAgentInvitations = SlateTool.create(spec, {
  name: 'List Agent Invitations',
  key: 'list_agent_invitations',
  description: 'List Natural agent delegation invitations.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      status: z
        .array(invitationStatusSchema)
        .optional()
        .describe('Invitation status filters.'),
      customerEmail: z.string().optional().describe('Filter by customer email address.'),
      agentId: z.string().optional().describe('Filter by Natural agent ID.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      invitations: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list agent invitations',
      'get',
      '/agents/invitations',
      {
        params: {
          status: ctx.input.status,
          customerEmail: ctx.input.customerEmail,
          agentId: ctx.input.agentId,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const output = listRawResult(envelope, 'invitations');

    return {
      output,
      message: summaryListMessage(countOf(output, 'invitations'), 'agent invitations')
    };
  })
  .build();

export const revokeAgentInvitation = SlateTool.create(spec, {
  name: 'Revoke Agent Invitation',
  key: 'revoke_agent_invitation',
  description: 'Revoke a Natural agent delegation invitation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      id: z.string().min(1).describe('Agent invitation ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      invitationId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      invitation: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this agent invitation');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an agent invitation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke agent invitation',
      'delete',
      `/agents/invitations/${ctx.input.id}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'invitationId', 'invitation'),
      message: `Revoked agent invitation **${ctx.input.id}**.`
    };
  })
  .build();
