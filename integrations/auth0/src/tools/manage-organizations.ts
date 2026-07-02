import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let manageOrganizationsTool = SlateTool.create(spec, {
  name: 'Manage Organizations',
  key: 'manage_organizations',
  description: `Create, update, delete, or list organizations for multi-tenant B2B scenarios. Organizations group users and can have their own connections, branding, and member roles.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe(
          'Organization name (required for create; must be lowercase and use hyphens)'
        ),
      displayName: z.string().optional().describe('Display name for the organization'),
      logoUrl: z.string().optional().describe('URL for organization logo'),
      primaryColor: z.string().optional().describe('Primary brand color (hex)'),
      pageBackgroundColor: z.string().optional().describe('Page background color (hex)'),
      metadata: z.record(z.string(), z.string()).optional().describe('Organization metadata'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Results per page (for list action)')
    })
  )
  .output(
    z.object({
      organization: z
        .object({
          organizationId: z.string(),
          name: z.string(),
          displayName: z.string().optional()
        })
        .optional()
        .describe('Organization details'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string(),
            name: z.string(),
            displayName: z.string().optional()
          })
        )
        .optional()
        .describe('List of organizations'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let mapOrg = (o: any) => ({
      organizationId: o.id,
      name: o.name,
      displayName: o.display_name
    });

    if (ctx.input.action === 'list') {
      let result = await client.listOrganizations({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let orgs = (Array.isArray(result) ? result : (result.organizations ?? [])).map(mapOrg);
      return {
        output: { organizations: orgs },
        message: `Found **${orgs.length}** organization(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for get action');
      let org = await client.getOrganization(ctx.input.organizationId);
      return {
        output: { organization: mapOrg(org) },
        message: `Retrieved organization **${org.display_name || org.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let branding =
        ctx.input.logoUrl || ctx.input.primaryColor || ctx.input.pageBackgroundColor
          ? {
              logoUrl: ctx.input.logoUrl,
              colors: {
                ...(ctx.input.primaryColor ? { primary: ctx.input.primaryColor } : {}),
                ...(ctx.input.pageBackgroundColor
                  ? { page_background: ctx.input.pageBackgroundColor }
                  : {})
              }
            }
          : undefined;
      let org = await client.createOrganization({
        name: ctx.input.name,
        displayName: ctx.input.displayName,
        branding,
        metadata: ctx.input.metadata
      });
      return {
        output: { organization: mapOrg(org) },
        message: `Created organization **${org.display_name || org.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for update action');
      let branding =
        ctx.input.logoUrl || ctx.input.primaryColor || ctx.input.pageBackgroundColor
          ? {
              logoUrl: ctx.input.logoUrl,
              colors: {
                ...(ctx.input.primaryColor ? { primary: ctx.input.primaryColor } : {}),
                ...(ctx.input.pageBackgroundColor
                  ? { page_background: ctx.input.pageBackgroundColor }
                  : {})
              }
            }
          : undefined;
      let org = await client.updateOrganization(ctx.input.organizationId, {
        name: ctx.input.name,
        displayName: ctx.input.displayName,
        branding,
        metadata: ctx.input.metadata
      });
      return {
        output: { organization: mapOrg(org) },
        message: `Updated organization **${org.display_name || org.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for delete action');
      await client.deleteOrganization(ctx.input.organizationId);
      return {
        output: { deleted: true },
        message: `Deleted organization **${ctx.input.organizationId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
