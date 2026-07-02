import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getMe();

    let organizations: any[] | undefined;
    if (ctx.input.includeOrganizations !== false) {
      let orgsResult = await client.getMyOrganizations();
      organizations = (orgsResult.organizations || []).map((org: any) => ({
        organizationId: org.id,
        name: org.name,
        imageUrl: org.image_id
          ? `https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F${org.image_id}`
          : undefined
      }));
    }

    return {
      output: {
        userId: user.id,
        name: user.name,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.emails?.[0]?.email,
        imageUrl: user.image_url,
        organizations
      },
      message: `Authenticated as **${user.name || user.emails?.[0]?.email || user.id}**${organizations ? ` with ${organizations.length} organization(s)` : ''}.`
    };
  })
  .build();
