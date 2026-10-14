import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { formatScimUser, scimUserSchema } from '../lib/scim-user';
import { spec } from '../spec';

export let listScimUsers = SlateTool.create(spec, {
  name: 'List SCIM Users',
  key: 'list_scim_users',
  description: `Lists provisioned users from an InVision Enterprise account via the SCIM API.
Supports filtering by username and pagination. Requires an Enterprise plan with SCIM provisioning enabled.

**Note:** InVision discontinued its design products on December 31, 2024. Legacy API availability is not guaranteed.`,
  instructions: [
    'The SCIM base URL is obtained from InVision Enterprise settings and should have "/scim/v2" appended.',
    'Authentication requires the SCIM Bearer Token auth method.'
  ],
  tags: {
    readOnly: true
  }
})
  .authMethods(['scim_bearer_token'])
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
        .min(1)
        .refine(Number.isSafeInteger, 'Start index must be a safe whole number')
        .optional()
        .describe('1-based index of the first result to return'),
      count: z
        .number()
        .nonnegative()
        .refine(Number.isSafeInteger, 'Count must be a safe whole number')
        .optional()
        .describe('Maximum number of results to return')
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

    let users = (response.Resources ?? []).map(formatScimUser);

    return {
      output: {
        users,
        totalResults: response.totalResults ?? users.length,
        startIndex: response.startIndex ?? ctx.input.startIndex ?? 1,
        itemsPerPage: response.itemsPerPage ?? users.length
      },
      message: `Found **${response.totalResults ?? users.length}** provisioned user(s).`
    };
  })
  .build();
