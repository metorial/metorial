import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization Info',
  key: 'get_organization',
  description: `Retrieves organization profile and policy information from OneDesk.
Returns the organization's configuration including available item types, container types, and user types.
Useful for discovering type identifiers needed when creating items, projects, or users.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeItemTypes: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include available work item types in the response.'),
      includeContainerTypes: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include available project/container types in the response.'),
      includeUserTypes: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include available user types in the response.')
    })
  )
  .output(
    z.object({
      organization: z
        .record(z.string(), z.any())
        .describe('Organization profile and policy information.'),
      itemTypes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Available work item types.'),
      containerTypes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Available project/container types.'),
      userTypes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Available user types.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let organization = await client.getOrganizationProfile();

    let itemTypes: any[] | undefined;
    let containerTypes: any[] | undefined;
    let userTypes: any[] | undefined;

    if (ctx.auth.authMethod === 'api_key') {
      if (ctx.input.includeItemTypes) {
        try {
          itemTypes = await client.getItemTypes();
        } catch (_e) {
          ctx.warn('Could not fetch item types');
        }
      }
      if (ctx.input.includeContainerTypes) {
        try {
          containerTypes = await client.getContainerTypes();
        } catch (_e) {
          ctx.warn('Could not fetch container types');
        }
      }
      if (ctx.input.includeUserTypes) {
        try {
          userTypes = await client.getUserTypes();
        } catch (_e) {
          ctx.warn('Could not fetch user types');
        }
      }
    }

    let orgName =
      organization?.organizationName || organization?.name || 'OneDesk Organization';

    return {
      output: {
        organization,
        itemTypes,
        containerTypes,
        userTypes
      },
      message: `Retrieved organization info for **${orgName}**.`
    };
  })
  .build();
