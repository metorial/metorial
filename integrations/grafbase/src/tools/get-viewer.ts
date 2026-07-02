import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getViewer = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_viewer',
  description: `Retrieves the authenticated user's profile and their organization memberships. Use this to discover the current user's identity, available organizations, and account slugs needed for other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('ID of the authenticated user'),
      name: z.string().optional().describe('Name of the authenticated user'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('ID of the organization'),
            name: z.string().describe('Name of the organization'),
            slug: z.string().describe('URL slug of the organization')
          })
        )
        .describe('Organizations the user belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let viewer = await client.getViewer();

    let organizations = (viewer?.organizations?.nodes || []).map((org: any) => ({
      organizationId: org.id,
      name: org.name,
      slug: org.slug
    }));

    return {
      output: {
        userId: viewer?.user?.id,
        name: viewer?.user?.name,
        organizations
      },
      message: `Retrieved profile for **${viewer?.user?.name || 'unknown user'}** with ${organizations.length} organization(s).`
    };
  })
  .build();
