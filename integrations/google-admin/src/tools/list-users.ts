import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Search and list user accounts in the Google Workspace domain. Supports filtering by query, domain, and org unit. Returns paginated results with user profile details.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.listUsers)
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search query to filter users. Supports fields like name, email, orgUnit, etc. Example: "name:John" or "orgUnitPath=/Engineering"'
        ),
      domain: z
        .string()
        .optional()
        .describe('Domain to scope the user listing to. Overrides the configured domain.'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return (1-500). Defaults to 100.'),
      pageToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results'),
      orderBy: z
        .enum(['email', 'familyName', 'givenName'])
        .optional()
        .describe('Field to sort results by'),
      sortOrder: z
        .enum(['ASCENDING', 'DESCENDING'])
        .optional()
        .describe('Sort order for results'),
      showDeleted: z
        .boolean()
        .optional()
        .describe('If true, includes recently deleted users in results')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().optional(),
            primaryEmail: z.string().optional(),
            name: z
              .object({
                givenName: z.string().optional(),
                familyName: z.string().optional(),
                fullName: z.string().optional()
              })
              .optional(),
            isAdmin: z.boolean().optional(),
            isDelegatedAdmin: z.boolean().optional(),
            suspended: z.boolean().optional(),
            orgUnitPath: z.string().optional(),
            creationTime: z.string().optional(),
            lastLoginTime: z.string().optional(),
            isEnrolledIn2Sv: z.boolean().optional(),
            isEnforcedIn2Sv: z.boolean().optional()
          })
        )
        .describe('List of users matching the query'),
      nextPageToken: z.string().optional().describe('Token for retrieving the next page'),
      totalResults: z.number().optional().describe('Estimated total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let result = await client.listUsers({
      query: ctx.input.query,
      domain: ctx.input.domain,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      orderBy: ctx.input.orderBy,
      sortOrder: ctx.input.sortOrder,
      showDeleted: ctx.input.showDeleted
    });

    let users = (result.users || []).map((u: any) => ({
      userId: u.id,
      primaryEmail: u.primaryEmail,
      name: u.name
        ? {
            givenName: u.name.givenName,
            familyName: u.name.familyName,
            fullName: u.name.fullName
          }
        : undefined,
      isAdmin: u.isAdmin,
      isDelegatedAdmin: u.isDelegatedAdmin,
      suspended: u.suspended,
      orgUnitPath: u.orgUnitPath,
      creationTime: u.creationTime,
      lastLoginTime: u.lastLoginTime,
      isEnrolledIn2Sv: u.isEnrolledIn2Sv,
      isEnforcedIn2Sv: u.isEnforcedIn2Sv
    }));

    return {
      output: {
        users,
        nextPageToken: result.nextPageToken,
        totalResults: result.totalResults
      },
      message: `Found **${users.length}** users${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.${result.nextPageToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
