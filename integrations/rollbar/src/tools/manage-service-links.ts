import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageServiceLinks = SlateTool.create(spec, {
  name: 'Manage Service Links',
  key: 'manage_service_links',
  description: `Create, list, update, or delete service links in a Rollbar project. Service links are templated URLs that provide quick navigation from Rollbar items to external tools and services.`,
  instructions: [
    'Use action "list" to see all service links.',
    'Use action "create" with name and template to create a new service link.',
    'Use action "update" with serviceLinkId to update a service link.',
    'Use action "delete" with serviceLinkId to delete a service link.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      serviceLinkId: z
        .number()
        .optional()
        .describe('Service link ID (required for "update" and "delete" actions)'),
      name: z
        .string()
        .optional()
        .describe('Service link display name (required for "create")'),
      template: z
        .string()
        .optional()
        .describe('URL template with variables (required for "create")')
    })
  )
  .output(
    z.object({
      serviceLink: z
        .object({
          serviceLinkId: z.number().describe('Service link ID'),
          name: z.string().describe('Service link name'),
          template: z.string().describe('URL template')
        })
        .optional()
        .describe('Single service link'),
      serviceLinks: z
        .array(
          z.object({
            serviceLinkId: z.number().describe('Service link ID'),
            name: z.string().describe('Service link name'),
            template: z.string().describe('URL template')
          })
        )
        .optional()
        .describe('List of service links'),
      deleted: z.boolean().optional().describe('Whether the service link was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapLink = (l: any) => ({
      serviceLinkId: l.id,
      name: l.name,
      template: l.template
    });

    if (ctx.input.action === 'list') {
      let result = await client.listServiceLinks();
      let links = (result?.result || []).map(mapLink);
      return {
        output: { serviceLinks: links },
        message: `Found **${links.length}** service links.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for "create" action');
      if (!ctx.input.template) throw new Error('template is required for "create" action');
      let result = await client.createServiceLink({
        name: ctx.input.name,
        template: ctx.input.template
      });
      let link = mapLink(result?.result);
      return {
        output: { serviceLink: link },
        message: `Created service link **${link.name}** (ID: ${link.serviceLinkId}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.serviceLinkId)
        throw new Error('serviceLinkId is required for "update" action');
      let result = await client.updateServiceLink(ctx.input.serviceLinkId, {
        name: ctx.input.name,
        template: ctx.input.template
      });
      let link = mapLink(result?.result);
      return {
        output: { serviceLink: link },
        message: `Updated service link **${link.name}** (ID: ${link.serviceLinkId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.serviceLinkId)
        throw new Error('serviceLinkId is required for "delete" action');
      await client.deleteServiceLink(ctx.input.serviceLinkId);
      return {
        output: { deleted: true },
        message: `Deleted service link **${ctx.input.serviceLinkId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
