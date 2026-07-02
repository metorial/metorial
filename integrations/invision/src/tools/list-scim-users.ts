import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { spec } from '../spec';

let scimUserSchema = z.object({
  userId: z.string().describe('SCIM user ID'),
  userName: z.string().describe('Username (typically email)'),
  givenName: z.string().optional().describe('First name'),
  familyName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Work email address'),
  active: z.boolean().optional().describe('Whether the user account is active')
});

export let listScimUsers = SlateTool.create(spec, {
  name: 'List SCIM Users',
  key: 'list_scim_users',
  description: `Lists provisioned users from an InVision Enterprise account via the SCIM API.
Supports filtering by username and pagination. Requires an Enterprise plan with SCIM provisioning enabled.

**Note:** InVision was shut down on December 31, 2024. This tool will only work if the service is still accessible.`,
  instructions: [
    'The SCIM base URL is obtained from InVision Enterprise settings and should have "/scim/v2" appended.',
    'Authentication requires the SCIM Bearer Token auth method.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scimBaseUrl: z
        .string()
        .describe('The SCIM API base URL (e.g., https://team.invisionapp.com/scim/v2)'),
      filter: z
        .string()
        .optional()
        .describe('SCIM filter expression (e.g., userName eq "user@example.com")'),
      startIndex: z
        .number()
        .optional()
        .describe('1-based index of the first result to return'),
      count: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      users: z.array(scimUserSchema).describe('List of provisioned users'),
      totalResults: z.number().describe('Total number of matching users'),
      startIndex: z.number().describe('Starting index of returned results'),
      itemsPerPage: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScimClient({
      token: ctx.auth.token,
      scimBaseUrl: ctx.input.scimBaseUrl
    });

    let response = await client.listUsers(
      ctx.input.filter,
      ctx.input.startIndex,
      ctx.input.count
    );

    let users = (response.Resources || []).map((r: any) => ({
      userId: r.id,
      userName: r.userName,
      givenName: r.name?.givenName,
      familyName: r.name?.familyName,
      email: r.emails?.find((e: any) => e.type === 'work')?.value || r.emails?.[0]?.value,
      active: r.active
    }));

    return {
      output: {
        users,
        totalResults: response.totalResults ?? users.length,
        startIndex: response.startIndex ?? 1,
        itemsPerPage: response.itemsPerPage ?? users.length
      },
      message: `Found **${response.totalResults ?? users.length}** provisioned user(s).`
    };
  })
  .build();
