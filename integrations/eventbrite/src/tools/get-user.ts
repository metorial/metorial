import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateIntegerFields } from '../lib/validation';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_user',
  description: `Retrieve profile information and organizations for the currently authenticated Eventbrite user. Useful for discovering the user's organization IDs and account details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Organization results page number, starting at 1.'),
      continuation: z
        .string()
        .optional()
        .describe('Organization continuation token returned by the previous page.'),
      includeOrganizations: z
        .boolean()
        .optional()
        .describe("Whether to also fetch the user's organizations. Defaults to true.")
    })
  )
  .output(
    z.object({
      userId: z.string().describe("The user's unique ID."),
      name: z.string().optional().describe("The user's display name."),
      firstName: z.string().optional().describe('First name.'),
      lastName: z.string().optional().describe('Last name.'),
      email: z.string().optional().describe('Primary email address.'),
      imageUrl: z.string().optional().describe('Profile image URL.'),
      hasMoreOrganizations: z
        .boolean()
        .optional()
        .describe('Whether more organization results are available.'),
      continuation: z
        .string()
        .optional()
        .describe('Token to retrieve the next organization page.'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization ID.'),
            name: z.string().optional().describe('Organization name.'),
            imageUrl: z.string().optional().describe('Organization logo URL.')
          })
        )
        .optional()
        .describe('Organizations the user belongs to.')
    })
  )
  .handleInvocation(async ctx => {
    validateIntegerFields(ctx.input, ['page'], 1);
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getMe();

    let organizations: any[] | undefined;
    let pagination: { has_more_items?: boolean; continuation?: string } | undefined;
    if (ctx.input.includeOrganizations !== false) {
      let orgsResult = await client.getMyOrganizations({
        page: ctx.input.page,
        continuation: ctx.input.continuation
      });
      pagination = orgsResult.pagination;
      organizations = (orgsResult.organizations || []).map((org: any) => ({
        organizationId: org.id,
        name: org.name ?? undefined,
        imageUrl: org.image?.url ?? undefined
      }));
    }

    return {
      output: {
        userId: user.id,
        name: user.name ?? undefined,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        email:
          user.emails?.find((email: { primary?: boolean; email?: string }) => email.primary)
            ?.email ??
          user.emails?.[0]?.email ??
          undefined,
        imageUrl: user.image_url ?? undefined,
        organizations,
        hasMoreOrganizations: pagination?.has_more_items,
        continuation: pagination?.continuation
      },
      message: `Authenticated as **${user.name || user.emails?.[0]?.email || user.id}**${organizations ? ` with ${organizations.length} organization(s)` : ''}.`
    };
  })
  .build();
