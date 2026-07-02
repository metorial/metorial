import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let accessGroupSchema = z.object({
  accessGroupId: z.string().describe('ID of the access group'),
  name: z.string().describe('Name of the access group')
});

let authorizationSchema = z.object({
  authorizationId: z.string().describe('Unique ID of the authorization'),
  email: z.string().describe('Email of the authorized user'),
  status: z.string().describe('Status: gated, authorized, or revoked'),
  dataroomId: z.string().describe('ID of the dataroom'),
  connectionId: z.string().nullable().optional().describe('ID of the associated connection'),
  isOwner: z.boolean().optional().describe('Whether the user is an owner'),
  subscribed: z.boolean().optional().describe('Whether the user is subscribed to updates'),
  accessGroups: z.array(accessGroupSchema).optional().describe('Assigned access groups'),
  createdAt: z.string().describe('When the authorization was created'),
  updatedAt: z.string().describe('When the authorization was last updated')
});

let mapAuthorization = (a: any) => ({
  authorizationId: a.id,
  email: a.email,
  status: a.status,
  dataroomId: a.dataroom_id,
  connectionId: a.connection_id,
  isOwner: a.is_owner,
  subscribed: a.subscribed,
  accessGroups: (a._embedded?.access_groups || []).map((g: any) => ({
    accessGroupId: g.id,
    name: g.name
  })),
  createdAt: a.created_at,
  updatedAt: a.updated_at
});

export let listAuthorizations = SlateTool.create(spec, {
  name: 'List Authorizations',
  key: 'list_authorizations',
  description: `Retrieve all Trust Center authorizations (granted access records). Filter by status or email to find specific authorizations. Useful for auditing who has access to your Trust Center and their access group assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['gated', 'authorized', 'revoked'])
        .optional()
        .describe('Filter by authorization status'),
      email: z.string().optional().describe('Filter by authorized email address')
    })
  )
  .output(
    z.object({
      authorizations: z.array(authorizationSchema).describe('List of authorizations'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listAuthorizations({
      status: ctx.input.status,
      email: ctx.input.email
    });

    let authorizations = (data.authorizations || []).map(mapAuthorization);

    return {
      output: {
        authorizations,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages
      },
      message: `Found **${authorizations.length}** authorizations${ctx.input.status ? ` with status "${ctx.input.status}"` : ''} (page ${data.page} of ${data.total_pages}).`
    };
  })
  .build();

export let grantAuthorization = SlateTool.create(spec, {
  name: 'Grant Authorization',
  key: 'grant_authorization',
  description: `Grant Trust Center access to a user. You can either approve a pending authorization request (by providing the requestId) or directly invite a user by email. Optionally assign access groups, bypass NDA, and set an expiration date.`,
  instructions: [
    'Provide either requestId (to approve a pending request) or email (to directly invite a user), but not both.',
    'Expiration date format is YYYY-MM-DD.'
  ]
})
  .input(
    z.object({
      requestId: z.string().optional().describe('ID of the authorization request to approve'),
      email: z.string().optional().describe('Email of the user to grant access to'),
      accessGroupIds: z.array(z.string()).optional().describe('Access group IDs to assign'),
      ndaBypass: z
        .boolean()
        .optional()
        .describe('Skip NDA signature requirement (default: false)'),
      expiresAt: z.string().optional().describe('Expiration date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      granted: z.boolean().describe('Whether the authorization was successfully granted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    await client.createAuthorization({
      requestId: ctx.input.requestId,
      email: ctx.input.email,
      accessGroupIds: ctx.input.accessGroupIds,
      ndaBypass: ctx.input.ndaBypass,
      expiresAt: ctx.input.expiresAt
    });

    let target = ctx.input.email || `request \`${ctx.input.requestId}\``;
    return {
      output: { granted: true },
      message: `Authorization **granted** to ${target}${ctx.input.expiresAt ? ` (expires ${ctx.input.expiresAt})` : ''}.`
    };
  })
  .build();

export let updateAuthorization = SlateTool.create(spec, {
  name: 'Update Authorization',
  key: 'update_authorization',
  description: `Update or revoke an existing Trust Center authorization. Modify access group assignments or revoke access entirely. When updating access groups, specify only the groups that should remain — omitted groups will be removed.`,
  instructions: [
    'Set status to "revoked" to revoke access.',
    'When updating access groups, pass the complete list of groups that should remain. Omitted groups will be removed. Pass an empty array to remove all access groups.'
  ]
})
  .input(
    z.object({
      authorizationId: z.string().describe('ID of the authorization to update'),
      accessGroupIds: z
        .array(z.string())
        .optional()
        .describe('Updated list of access group IDs (replaces existing groups)'),
      status: z
        .literal('revoked')
        .optional()
        .describe('Set to "revoked" to revoke the authorization')
    })
  )
  .output(authorizationSchema)
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let a = await client.updateAuthorization(ctx.input.authorizationId, {
      accessGroupIds: ctx.input.accessGroupIds,
      status: ctx.input.status
    });

    let output = mapAuthorization(a);

    let action = ctx.input.status === 'revoked' ? 'revoked' : 'updated';
    return {
      output,
      message: `Authorization for **${a.email}** has been **${action}**.`
    };
  })
  .build();
