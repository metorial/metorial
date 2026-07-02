import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSpace = SlateTool.create(spec, {
  name: 'Manage Space',
  key: 'manage_space',
  description: `Create, update, or delete a Space in the Retool organization. Spaces are isolated sub-environments for multi-tenant or multi-team setups.`,
  constraints: [
    'Requires Spaces to be enabled on the organization.',
    'API calls must be made from the Admin Space domain.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      spaceId: z.string().optional().describe('Space ID (required for update and delete)'),
      spaceName: z.string().optional().describe('Name of the space (required for create)'),
      domain: z.string().optional().describe('Domain for the space (required for create)'),
      copySsoSettings: z
        .boolean()
        .optional()
        .describe('Copy SSO settings from parent (only for create)'),
      copyBrandingAndThemesSettings: z
        .boolean()
        .optional()
        .describe('Copy branding and themes from parent (only for create)'),
      createAdminUser: z
        .boolean()
        .optional()
        .describe('Create an admin user in the new space (only for create)')
    })
  )
  .output(
    z.object({
      spaceId: z.string(),
      spaceName: z.string().optional(),
      domain: z.string().optional(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.spaceName || !ctx.input.domain) {
        throw new Error('spaceName and domain are required for the create action');
      }
      let result = await client.createSpace({
        name: ctx.input.spaceName,
        domain: ctx.input.domain,
        options: {
          copySsoSettings: ctx.input.copySsoSettings,
          copyBrandingAndThemesSettings: ctx.input.copyBrandingAndThemesSettings,
          createAdminUser: ctx.input.createAdminUser
        }
      });
      let s = result.data;
      return {
        output: {
          spaceId: s.id,
          spaceName: s.name,
          domain: s.domain,
          action: 'create',
          success: true
        },
        message: `Created space **${s.name}** at domain \`${s.domain}\` with ID \`${s.id}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.spaceId) {
        throw new Error('spaceId is required for the update action');
      }
      let result = await client.updateSpace(ctx.input.spaceId, {
        name: ctx.input.spaceName,
        domain: ctx.input.domain
      });
      let s = result.data;
      return {
        output: {
          spaceId: s.id,
          spaceName: s.name,
          domain: s.domain,
          action: 'update',
          success: true
        },
        message: `Updated space **${s.name}** (ID: \`${s.id}\`).`
      };
    }

    // delete
    if (!ctx.input.spaceId) {
      throw new Error('spaceId is required for the delete action');
    }
    await client.deleteSpace(ctx.input.spaceId);
    return {
      output: {
        spaceId: ctx.input.spaceId,
        action: 'delete',
        success: true
      },
      message: `Deleted space \`${ctx.input.spaceId}\`.`
    };
  })
  .build();
