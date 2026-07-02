import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z.object({
  siteId: z.number().describe('Site ID'),
  name: z.string().optional().describe('Site name'),
  url: z.string().optional().describe('URL being monitored'),
  active: z.boolean().optional().describe('Whether the site is being monitored'),
  frequency: z.number().optional().describe('Check frequency in minutes'),
  matchType: z.string().optional().describe('Match type for response validation'),
  match: z.string().optional().describe('Match pattern'),
  requestMethod: z.string().optional().describe('HTTP method used for checks'),
  state: z.string().optional().describe('Current state (up/down)'),
  lastCheckedAt: z.string().optional().describe('When the site was last checked'),
  validateSsl: z.boolean().optional().describe('Whether SSL is validated')
});

export let manageUptime = SlateTool.create(spec, {
  name: 'Manage Uptime Checks',
  key: 'manage_uptime',
  description: `Create, update, list, or delete uptime monitoring checks (sites) in a Honeybadger project. Uptime checks periodically monitor whether your web applications and APIs are responsive.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: z.string().describe('Project ID'),
      siteId: z.string().optional().describe('Site ID (required for get, update, delete)'),
      name: z.string().optional().describe('Site name (required for create)'),
      url: z.string().optional().describe('URL to monitor (required for create)'),
      frequency: z.number().optional().describe('Check frequency in minutes (1, 5, or 15)'),
      matchType: z
        .enum(['success', 'exact', 'include', 'exclude'])
        .optional()
        .describe('Response match type'),
      match: z.string().optional().describe('Match pattern for response validation'),
      requestMethod: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .optional()
        .describe('HTTP method'),
      validateSsl: z.boolean().optional().describe('Whether to validate SSL certificates'),
      active: z.boolean().optional().describe('Whether the check is active')
    })
  )
  .output(
    z.object({
      sites: z.array(siteSchema).optional().describe('List of sites (for list action)'),
      site: siteSchema.optional().describe('Site details (for get/create action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let {
      action,
      projectId,
      siteId,
      name,
      url,
      frequency,
      matchType,
      match,
      requestMethod,
      validateSsl,
      active
    } = ctx.input;

    let mapSite = (s: any) => ({
      siteId: s.id,
      name: s.name,
      url: s.url,
      active: s.active,
      frequency: s.frequency,
      matchType: s.match_type,
      match: s.match,
      requestMethod: s.request_method,
      state: s.state,
      lastCheckedAt: s.last_checked_at,
      validateSsl: s.validate_ssl
    });

    switch (action) {
      case 'list': {
        let data = await client.listSites(projectId);
        let sites = (data.results || []).map(mapSite);
        return {
          output: { sites, success: true },
          message: `Found **${sites.length}** uptime check(s).`
        };
      }

      case 'get': {
        if (!siteId) throw new Error('siteId is required for get action');
        let site = await client.getSite(projectId, siteId);
        return {
          output: { site: mapSite(site), success: true },
          message: `Site **${site.name}** is currently **${site.state || 'unknown'}**.`
        };
      }

      case 'create': {
        if (!name || !url) throw new Error('name and url are required for create action');
        let created = await client.createSite(projectId, {
          name,
          url,
          frequency,
          matchType,
          match,
          requestMethod,
          validateSsl,
          active
        });
        return {
          output: { site: mapSite(created), success: true },
          message: `Created uptime check **${created.name}** for ${created.url}.`
        };
      }

      case 'update': {
        if (!siteId) throw new Error('siteId is required for update action');
        await client.updateSite(projectId, siteId, {
          name,
          url,
          frequency,
          matchType,
          match,
          requestMethod,
          validateSsl,
          active
        });
        return {
          output: { success: true },
          message: `Updated uptime check **${siteId}**.`
        };
      }

      case 'delete': {
        if (!siteId) throw new Error('siteId is required for delete action');
        await client.deleteSite(projectId, siteId);
        return {
          output: { success: true },
          message: `Deleted uptime check **${siteId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
