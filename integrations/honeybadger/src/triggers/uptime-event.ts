import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let uptimeEvent = SlateTrigger.create(spec, {
  name: 'Uptime Event',
  key: 'uptime_event',
  description:
    'Triggers when an uptime event occurs — site goes down, comes back up, or an SSL certificate is about to expire.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of uptime event (down, up, cert_will_expire)'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      siteId: z.number().describe('Site ID'),
      siteName: z.string().optional().describe('Site name'),
      siteUrl: z.string().optional().describe('Monitored URL'),
      outageDownAt: z.string().optional().describe('When the site went down'),
      outageUpAt: z.string().optional().describe('When the site came back up'),
      outageStatus: z.number().optional().describe('HTTP status code'),
      outageReason: z.string().optional().describe('Outage reason')
    })
  )
  .output(
    z.object({
      siteId: z.number().describe('Site ID'),
      siteName: z.string().optional().describe('Site name'),
      siteUrl: z.string().optional().describe('Monitored URL'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      downAt: z.string().optional().describe('When the site went down'),
      upAt: z.string().optional().describe('When the site came back up'),
      httpStatus: z.number().optional().describe('HTTP status code'),
      reason: z.string().optional().describe('Outage reason')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let event = body.event || 'down';

      let project = body.project || {};
      let site = body.site || {};
      let outage = body.outage || {};

      return {
        inputs: [
          {
            eventType: event,
            projectId: project.id,
            projectName: project.name,
            siteId: site.id,
            siteName: site.name,
            siteUrl: site.url,
            outageDownAt: outage.down_at,
            outageUpAt: outage.up_at,
            outageStatus: outage.status,
            outageReason: outage.reason
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        eventType,
        siteId,
        siteName,
        siteUrl,
        projectId,
        projectName,
        outageDownAt,
        outageUpAt,
        outageStatus,
        outageReason
      } = ctx.input;

      return {
        type: `site.${eventType}`,
        id: `${projectId}-${siteId}-${eventType}-${outageDownAt || Date.now()}`,
        output: {
          siteId,
          siteName,
          siteUrl,
          projectId,
          projectName,
          downAt: outageDownAt,
          upAt: outageUpAt,
          httpStatus: outageStatus,
          reason: outageReason
        }
      };
    }
  })
  .build();
