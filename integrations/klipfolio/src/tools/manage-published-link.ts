import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePublishedLink = SlateTool.create(spec, {
  name: 'Manage Published Link',
  key: 'manage_published_link',
  description: `Create, update, or delete a published link for a dashboard. Published links are shareable URLs that allow external stakeholders to view a dashboard without a Klipfolio account. Optionally password-protect links.`,
  instructions: [
    'Use action "create" to generate a new shareable link for a dashboard, "update" to modify, or "delete" to remove.',
    'Set a password to restrict access. Use theme "light" or "dark" for display preferences.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      linkId: z
        .string()
        .optional()
        .describe('Published link ID (required for update and delete)'),
      dashboardId: z
        .string()
        .optional()
        .describe('Dashboard ID to create the published link for (required for create)'),
      name: z.string().optional().describe('Name for the published link'),
      description: z.string().optional().describe('Description of the published link'),
      password: z.string().optional().describe('Password to protect the link'),
      isPublic: z.boolean().optional().describe('Whether the link is publicly searchable'),
      theme: z.enum(['light', 'dark']).optional().describe('Display theme'),
      logo: z.string().optional().describe('URL of a custom logo image')
    })
  )
  .output(
    z.object({
      linkId: z.string().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.dashboardId)
        throw new Error('dashboardId is required when creating a published link');

      let result = await client.createPublishedLink(ctx.input.dashboardId, {
        name: ctx.input.name,
        description: ctx.input.description,
        password: ctx.input.password,
        isPublic: ctx.input.isPublic,
        theme: ctx.input.theme,
        logo: ctx.input.logo
      });

      let location = result?.meta?.location;
      let linkId = location ? location.split('/').pop() : undefined;

      return {
        output: { linkId, success: true },
        message: `Created published link${ctx.input.name ? ` **${ctx.input.name}**` : ''} for dashboard \`${ctx.input.dashboardId}\`${linkId ? ` with ID \`${linkId}\`` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.linkId) throw new Error('linkId is required when updating');

      await client.updatePublishedLink(ctx.input.linkId, {
        name: ctx.input.name,
        description: ctx.input.description,
        password: ctx.input.password,
        isPublic: ctx.input.isPublic,
        theme: ctx.input.theme,
        logo: ctx.input.logo
      });

      return {
        output: { linkId: ctx.input.linkId, success: true },
        message: `Updated published link \`${ctx.input.linkId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.linkId) throw new Error('linkId is required when deleting');
      await client.deletePublishedLink(ctx.input.linkId);

      return {
        output: { linkId: ctx.input.linkId, success: true },
        message: `Deleted published link \`${ctx.input.linkId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
