import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type OrgAccessTokenResource } from '../lib/client';
import { dockerHubServiceError } from '../lib/errors';
import { spec } from '../spec';

let orgAccessTokenResourceSchema = z.object({
  type: z
    .enum(['TYPE_REPO', 'TYPE_ORG'])
    .describe('Resource type. Use TYPE_REPO for repository paths or TYPE_ORG for org scope.'),
  path: z
    .string()
    .describe(
      'Resource path, such as "myorg/myrepo", "myorg/*", or "*/*/public" for public repositories.'
    ),
  scopes: z
    .array(z.string())
    .min(1)
    .describe(
      'Docker organization token scopes for this resource, such as "scope-image-pull".'
    )
});

let orgAccessTokenOutput = z.object({
  tokenId: z.string().describe('Organization access token ID.'),
  label: z.string().describe('Token label.'),
  description: z
    .string()
    .optional()
    .describe('Token description when returned by Docker Hub.'),
  createdBy: z.string().describe('Docker Hub username that created the token.'),
  isActive: z.boolean().describe('Whether the token is active.'),
  createdAt: z.string().describe('ISO timestamp when the token was created.'),
  expiresAt: z
    .string()
    .nullable()
    .describe('ISO timestamp when the token expires, or null for no expiration.'),
  lastUsedAt: z
    .string()
    .nullable()
    .describe('ISO timestamp when the token was last used, or null if never used.'),
  resources: z
    .array(orgAccessTokenResourceSchema)
    .optional()
    .describe('Resources this organization token can access.')
});

let formatOrgAccessToken = (token: {
  id: string;
  label: string;
  description?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  resources?: OrgAccessTokenResource[];
}) => ({
  tokenId: token.id,
  label: token.label,
  description: token.description,
  createdBy: token.created_by || '',
  isActive: token.is_active,
  createdAt: token.created_at,
  expiresAt: token.expires_at,
  lastUsedAt: token.last_used_at,
  resources: token.resources
});

export let listOrgAccessTokens = SlateTool.create(spec, {
  name: 'List Organization Access Tokens',
  key: 'list_org_access_tokens',
  description: `List Docker Hub organization access tokens (OATs) for an organization. OATs are organization-owned automation tokens managed by organization owners.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      page: z.number().optional().describe('Page number for pagination.'),
      pageSize: z.number().optional().describe('Number of results per page.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of organization access tokens.'),
      tokens: z.array(orgAccessTokenOutput).describe('Organization access tokens.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listOrgAccessTokens(ctx.input.orgName, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.total,
        tokens: result.results.map(formatOrgAccessToken)
      },
      message: `Found **${result.total}** organization access tokens in **${ctx.input.orgName}**.`
    };
  })
  .build();

export let getOrgAccessToken = SlateTool.create(spec, {
  name: 'Get Organization Access Token',
  key: 'get_org_access_token',
  description: `Get details for a Docker Hub organization access token, including active status, expiration, and resource scopes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      tokenId: z.string().describe('Organization access token ID.')
    })
  )
  .output(orgAccessTokenOutput)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let token = await client.getOrgAccessToken(ctx.input.orgName, ctx.input.tokenId);

    return {
      output: formatOrgAccessToken(token),
      message: `Retrieved organization access token **${token.label}**.`
    };
  })
  .build();

export let createOrgAccessToken = SlateTool.create(spec, {
  name: 'Create Organization Access Token',
  key: 'create_org_access_token',
  description: `Create a Docker Hub organization access token (OAT) for automation. The token value is returned only once when the token is created.`,
  instructions: [
    'The generated organization token value is only returned once - store it securely.',
    'Use repository resources such as "myorg/myrepo" or "myorg/*" with scopes such as "scope-image-pull" or "scope-image-push".'
  ]
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      label: z.string().describe('Label for the organization access token.'),
      description: z.string().optional().describe('Description for the token.'),
      resources: z
        .array(orgAccessTokenResourceSchema)
        .optional()
        .describe('Resources this organization token can access.'),
      expiresAt: z
        .string()
        .optional()
        .describe('Optional expiration date for the token in ISO 8601 format.')
    })
  )
  .output(
    orgAccessTokenOutput.extend({
      tokenValue: z
        .string()
        .describe('The generated organization token value. Store securely - shown once.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let token = await client.createOrgAccessToken(ctx.input.orgName, {
      label: ctx.input.label,
      description: ctx.input.description,
      resources: ctx.input.resources,
      expires_at: ctx.input.expiresAt
    });

    return {
      output: {
        ...formatOrgAccessToken(token),
        tokenValue: token.token || ''
      },
      message: `Created organization access token **${token.label}**. Store the token value securely - it won't be shown again.`
    };
  })
  .build();

export let updateOrgAccessToken = SlateTool.create(spec, {
  name: 'Update Organization Access Token',
  key: 'update_org_access_token',
  description: `Update a Docker Hub organization access token's label, description, resources, or active status.`
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      tokenId: z.string().describe('Organization access token ID.'),
      label: z.string().optional().describe('New token label.'),
      description: z.string().optional().describe('New token description.'),
      resources: z
        .array(orgAccessTokenResourceSchema)
        .optional()
        .describe('Replacement resource scope list for the token.'),
      isActive: z
        .boolean()
        .optional()
        .describe('Set to false to deactivate the token, true to reactivate.')
    })
  )
  .output(orgAccessTokenOutput)
  .handleInvocation(async ctx => {
    if (
      ctx.input.label === undefined &&
      ctx.input.description === undefined &&
      ctx.input.resources === undefined &&
      ctx.input.isActive === undefined
    ) {
      throw dockerHubServiceError(
        'Provide label, description, resources, or isActive to update the organization access token.'
      );
    }

    let client = new Client(ctx.auth);
    let token = await client.updateOrgAccessToken(ctx.input.orgName, ctx.input.tokenId, {
      label: ctx.input.label,
      description: ctx.input.description,
      resources: ctx.input.resources,
      is_active: ctx.input.isActive
    });

    return {
      output: formatOrgAccessToken(token),
      message: `Updated organization access token **${token.label}**.`
    };
  })
  .build();

export let deleteOrgAccessToken = SlateTool.create(spec, {
  name: 'Delete Organization Access Token',
  key: 'delete_org_access_token',
  description: `Permanently delete a Docker Hub organization access token. Any automation using it immediately loses access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      tokenId: z.string().describe('Organization access token ID.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the token was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteOrgAccessToken(ctx.input.orgName, ctx.input.tokenId);

    return {
      output: { deleted: true },
      message: `Deleted organization access token **${ctx.input.tokenId}**.`
    };
  })
  .build();
