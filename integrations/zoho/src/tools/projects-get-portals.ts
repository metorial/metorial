import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoProjectsClient } from '../lib/client';
import { spec } from '../spec';

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let mapProjectsV3Portals = (result: unknown) => {
  let records = Array.isArray(result)
    ? result
    : isRecord(result) && Array.isArray(result.portals)
      ? result.portals
      : [];

  return records
    .filter(isRecord)
    .map(portal => ({
      portalId: portal.id || portal.portal_id || portal.portalId,
      name: portal.name || portal.portal_name,
      role: portal.role || (isRecord(portal.profile) ? portal.profile.name : undefined)
    }))
    .filter((portal: { portalId?: unknown }) => portal.portalId)
    .map((portal: { portalId: unknown; name?: string; role?: string }) => ({
      ...portal,
      portalId: String(portal.portalId)
    }));
};

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
    let result = await ZohoProjectsClient.listPortals(ctx.auth);
    let portals = mapProjectsV3Portals(result);

    return {
      output: { portals },
      message: `Found **${portals.length}** Zoho Projects portals.`
    };
  })
  .build();
