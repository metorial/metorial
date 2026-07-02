import { SlateTool } from 'slates';
import { z } from 'zod';
import { jsonApiBody } from '../lib/envelopes';
import { customerPaginationInputFields } from '../lib/pagination';
import { recipientObject, requireConfirm } from '../lib/validation';
import { spec } from '../spec';
import {
  confirmSchema,
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

const customerListOutputSchema = z.object({
  customers: rawRecordArraySchema,
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable()
  })
});

const customerOutputSchema = z.object({
  customerId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  customer: rawRecordSchema
});

const customerInvitationOutputSchema = z.object({
  invitations: rawRecordArraySchema,
  failedRecipients: z.array(z.any())
});

export const listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: 'List Natural customers. Natural defaults this endpoint to 20 records.',
  tags: { readOnly: true }
})
  .input(z.object(customerPaginationInputFields))
  .output(customerListOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list customers', 'get', '/customers', {
      params: {
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    const output = listRawResult(envelope, 'customers');

    return {
      output,
      message: summaryListMessage(countOf(output, 'customers'), 'customers')
    };
  })
  .build();

export const getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: 'Retrieve a Natural customer by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().min(1).describe('Natural customer ID.')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get customer',
      'get',
      `/customers/${ctx.input.customerId}`
    );

    return {
      output: resourceResult(envelope, 'customerId', 'customer'),
      message: `Retrieved customer **${ctx.input.customerId}**.`
    };
  })
  .build();

export const listCustomerInvitations = SlateTool.create(spec, {
  name: 'List Customer Invitations',
  key: 'list_customer_invitations',
  description:
    'List Natural customer invitations. Natural defaults this endpoint to 20 records.',
  tags: { readOnly: true }
})
  .input(z.object(customerPaginationInputFields))
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
      'list customer invitations',
      'get',
      '/customers/invitations',
      {
        params: {
          cursor: ctx.input.cursor,
          limit: ctx.input.limit
        }
      }
    );
    const output = listRawResult(envelope, 'invitations');

    return {
      output,
      message: summaryListMessage(countOf(output, 'invitations'), 'customer invitations')
    };
  })
  .build();

export const createCustomerInvitations = SlateTool.create(spec, {
  name: 'Create Customer Invitations',
  key: 'create_customer_invitations',
  description:
    'Create Natural customer invitations for one or more recipients and one or more agents. This endpoint is not documented as idempotent.'
})
  .input(
    z.object({
      recipients: z.array(recipientSchema).min(1).max(100).describe('Recipients to invite.'),
      agents: z
        .array(
          z.object({
            agentId: z.string().min(1).describe('Natural agent ID.'),
            permissions: z
              .array(z.string().min(1))
              .min(1)
              .describe('Natural permission strings.'),
            limits: perTransactionLimitsSchema
          })
        )
        .min(1)
        .max(50)
        .describe('Agents the invited customer can delegate to.'),
      expiresAt: z.string().optional().describe('Invitation expiration timestamp.')
    })
  )
  .output(customerInvitationOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'create customer invitations',
      'post',
      '/customers/invitations',
      {
        body: jsonApiBody(
          attributesBody({
            recipients: ctx.input.recipients.map(recipientObject),
            agents: ctx.input.agents,
            expiresAt: ctx.input.expiresAt
          })
        )
      }
    );
    const invitations = Array.isArray((envelope as any)?.data) ? (envelope as any).data : [];

    return {
      output: {
        invitations,
        failedRecipients: metaArray(envelope, 'failedRecipients')
      },
      message: `Created **${invitations.length}** customer invitations.`
    };
  })
  .build();

export const revokeCustomerInvitation = SlateTool.create(spec, {
  name: 'Revoke Customer Invitation',
  key: 'revoke_customer_invitation',
  description:
    'Revoke a Natural customer invitation. This endpoint is not documented as idempotent.',
  tags: { destructive: true }
})
  .input(
    z.object({
      invitationId: z.string().min(1).describe('Natural customer invitation ID.'),
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
    requireConfirm(ctx.input.confirm, 'revoke this customer invitation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke customer invitation',
      'delete',
      `/customers/invitations/${ctx.input.invitationId}`
    );

    return {
      output: deleteOutput(envelope, 'invitationId', 'invitation'),
      message: `Revoked customer invitation **${ctx.input.invitationId}**.`
    };
  })
  .build();

export const revokeCustomerAgent = SlateTool.create(spec, {
  name: 'Revoke Customer Agent',
  key: 'revoke_customer_agent',
  description: 'Revoke a Natural agent delegation from a customer.',
  tags: { destructive: true }
})
  .input(
    z.object({
      customerId: z.string().min(1).describe('Natural customer ID.'),
      agentId: z.string().min(1).describe('Natural agent ID.'),
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
    requireConfirm(ctx.input.confirm, 'revoke this customer-agent delegation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke customer agent',
      'delete',
      `/customers/${ctx.input.customerId}/agents/${ctx.input.agentId}`
    );
    const output = deleteOutput(envelope, 'customerId', 'customer');

    return {
      output: {
        ...output,
        deleted: true
      },
      message: `Revoked agent **${ctx.input.agentId}** from customer **${ctx.input.customerId}**.`
    };
  })
  .build();
