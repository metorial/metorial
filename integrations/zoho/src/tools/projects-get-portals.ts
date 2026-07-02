import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoProjectsClient } from '../lib/client';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let projectsGetPortals = SlateTool.create(spec, {
  name: 'Projects Get Portals',
  key: 'projects_get_portals',
  description:
    'List Zoho Projects portals available to the authenticated user so project and task tools can be called with the correct portalId.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      portals: z
        .array(
          z.object({
            portalId: z.string(),
            name: z.string().optional(),
            role: z.string().optional()
          })
        )
        .describe('Available Zoho Projects portals')
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let result = await ZohoProjectsClient.listPortals(ctx.auth.token, dc);
    let portals = (result?.portals || [])
      .map((portal: any) => ({
        portalId: portal.id || portal.portal_id || portal.portalId,
        name: portal.name || portal.portal_name,
        role: portal.role
      }))
      .filter((portal: { portalId?: unknown }) => portal.portalId)
      .map((portal: { portalId: unknown; name?: string; role?: string }) => ({
        ...portal,
        portalId: String(portal.portalId)
      }));

    return {
      output: { portals },
      message: `Found **${portals.length}** Zoho Projects portals.`
    };
  })
  .build();
