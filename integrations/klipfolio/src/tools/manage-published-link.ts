import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { createdId, validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let managePublishedLink = SlateTool.create(spec, {
  name: 'Manage Published Link',
  key: 'manage_published_link',
  description: `Create, update, or delete a published link for a dashboard. Published links are shareable URLs that allow external stakeholders to view a dashboard without a Klipfolio account. Optionally password-protect links.`,
  constraints: [
    'Creating a published link exposes dashboard content outside the account. isPublic false prevents public search but does not require a password; supply password to restrict access.'
  ],
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
      description: z
        .string()
        .optional()
        .describe(
          'Legacy field not supported by the documented API; omit it and use name instead'
        ),
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
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.dashboardId)
        throw createApiServiceError('dashboardId is required when creating a published link');

      let result = await client.createPublishedLink(ctx.input.dashboardId, {
        name: ctx.input.name,
        description: ctx.input.description,
        password: ctx.input.password,
        isPublic: ctx.input.isPublic,
        theme: ctx.input.theme,
        logo: ctx.input.logo
      });

      let linkId = createdId(result, 'dashboard-published-links');

      return {
        output: { linkId, success: true },
        message: `Created published link${ctx.input.name ? ` **${ctx.input.name}**` : ''} for dashboard \`${ctx.input.dashboardId}\`${linkId ? ` with ID \`${linkId}\`` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (
        ctx.input.name === undefined &&
        ctx.input.password === undefined &&
        ctx.input.description === undefined &&
        ctx.input.isPublic === undefined &&
        ctx.input.theme === undefined &&
        ctx.input.logo === undefined
      )
        throw createApiServiceError(
          'Provide at least one supported field or association to update.',
          { reason: 'invalid_input' }
        );
      if (!ctx.input.linkId) throw createApiServiceError('linkId is required when updating');

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
      if (!ctx.input.linkId) throw createApiServiceError('linkId is required when deleting');
      await client.deletePublishedLink(ctx.input.linkId);

      return {
        output: { linkId: ctx.input.linkId, success: true },
        message: `Deleted published link \`${ctx.input.linkId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
