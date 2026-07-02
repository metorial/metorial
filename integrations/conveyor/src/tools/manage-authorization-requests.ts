import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let authorizationRequestSchema = z.object({
  requestId: z.string().describe('Unique ID of the authorization request'),
  email: z.string().describe('Email of the requester'),
  status: z.string().describe('Status: initial, requested, approved, or ignored'),
  message: z.string().nullable().optional().describe('Message from the requester'),
  dataroomId: z.string().describe('ID of the associated dataroom'),
  requestedAt: z.string().nullable().optional().describe('When the request was made'),
  crmLink: z.string().nullable().optional().describe('CRM link for the requester'),
  createdAt: z.string().describe('When the record was created'),
  updatedAt: z.string().describe('When the record was last updated')
});

export let listAuthorizationRequests = SlateTool.create(spec, {
  name: 'List Authorization Requests',
  key: 'list_authorization_requests',
  description: `Retrieve Trust Center access requests from customers. Filter by status to find pending requests that need review, or by email to find requests from a specific person. Use this to monitor and triage access requests to your Trust Center.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['initial', 'requested', 'approved', 'ignored'])
        .optional()
        .describe('Filter by request status'),
      email: z.string().optional().describe('Filter by requester email address')
    })
  )
  .output(
    z.object({
      authorizationRequests: z
        .array(authorizationRequestSchema)
        .describe('List of authorization requests'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listAuthorizationRequests({
      status: ctx.input.status,
      email: ctx.input.email
    });

    let authorizationRequests = (data.authorization_requests || []).map((r: any) => ({
      requestId: r.id,
      email: r.email,
      status: r.status,
      message: r.message,
      dataroomId: r.dataroom_id,
      requestedAt: r.requested_at,
      crmLink: r.crm_link,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: {
        authorizationRequests,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages
      },
      message: `Found **${authorizationRequests.length}** authorization requests${ctx.input.status ? ` with status "${ctx.input.status}"` : ''} (page ${data.page} of ${data.total_pages}).`
    };
  })
  .build();

export let getAuthorizationRequest = SlateTool.create(spec, {
  name: 'Get Authorization Request',
  key: 'get_authorization_request',
  description: `Retrieve details of a specific Trust Center access request by its ID. Returns the requester's email, status, message, and CRM information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z.string().describe('ID of the authorization request to retrieve')
    })
  )
  .output(authorizationRequestSchema)
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });
    let r = await client.getAuthorizationRequest(ctx.input.requestId);

    let output = {
      requestId: r.id,
      email: r.email,
      status: r.status,
      message: r.message,
      dataroomId: r.dataroom_id,
      requestedAt: r.requested_at,
      crmLink: r.crm_link,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };

    return {
      output,
      message: `Authorization request from **${r.email}** with status **${r.status}**.`
    };
  })
  .build();

export let ignoreAuthorizationRequest = SlateTool.create(spec, {
  name: 'Ignore Authorization Request',
  key: 'ignore_authorization_request',
  description: `Deny/ignore a pending Trust Center access request. Sets the request status to "ignored" so the requester is not granted access. Requires the reviewer's email for audit purposes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      requestId: z.string().describe('ID of the authorization request to ignore'),
      reviewerEmail: z.string().describe('Email of the person reviewing/ignoring the request')
    })
  )
  .output(authorizationRequestSchema)
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });
    let r = await client.ignoreAuthorizationRequest(
      ctx.input.requestId,
      ctx.input.reviewerEmail
    );

    let output = {
      requestId: r.id,
      email: r.email,
      status: r.status,
      message: r.message,
      dataroomId: r.dataroom_id,
      requestedAt: r.requested_at,
      crmLink: r.crm_link,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };

    return {
      output,
      message: `Authorization request from **${r.email}** has been **ignored** by ${ctx.input.reviewerEmail}.`
    };
  })
  .build();
