import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import type { Site } from '../lib/types';
import { nextUrlSchema, projectIdSchema, requireUpdate } from '../lib/validation';
import { spec } from '../spec';

let siteSchema = z.object({
  siteId: z
    .number()
    .optional()
    .describe('Legacy numeric ID, only present if the provider returns a number'),
  siteIdentifier: z
    .string()
    .optional()
    .describe('Uptime site ID (UUID). Use this value in siteId inputs'),
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
      nextUrl: nextUrlSchema,
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: projectIdSchema,
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
      nextUrl: z
        .string()
        .optional()
        .describe('Next-page URL, when another page may be available'),
      sites: z.array(siteSchema).optional().describe('List of sites (for list action)'),
      site: siteSchema.optional().describe('Site details (for get/create action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
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

    let mapSite = (s: Site) => ({
      siteId: typeof s.id === 'number' ? s.id : undefined,
      siteIdentifier: String(s.id),
      name: s.name ?? undefined,
      url: s.url ?? undefined,
      active: s.active ?? undefined,
      frequency: s.frequency ?? undefined,
      matchType: s.match_type ?? undefined,
      match: s.match ?? undefined,
      requestMethod: s.request_method ?? undefined,
      state: s.state ?? undefined,
      lastCheckedAt: s.last_checked_at ?? undefined,
      validateSsl: s.validate_ssl ?? undefined
    });

    if (frequency !== undefined && ![1, 5, 15].includes(frequency))
      throw createApiServiceError('frequency must be 1, 5, or 15 minutes.');
    if (url !== undefined) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw createApiServiceError('Provide a valid HTTP or HTTPS monitoring URL.');
      }
      if (!['http:', 'https:'].includes(parsed.protocol))
        throw createApiServiceError('Monitoring URLs must use HTTP or HTTPS.');
    }
    if (matchType && matchType !== 'success' && action === 'create' && !match)
      throw createApiServiceError(
        'match is required for exact, include, and exclude matching.'
      );
    switch (action) {
      case 'list': {
        let data = await client.listSites(projectId, ctx.input.nextUrl);
        let sites = (data.results || []).map(mapSite);
        return {
          output: { sites, nextUrl: data.links?.next ?? undefined, success: true },
          message: `Found **${sites.length}** uptime check(s).`
        };
      }

      case 'get': {
        if (!siteId) throw createApiServiceError('siteId is required for get action');
        let site = await client.getSite(projectId, siteId);
        return {
          output: { site: mapSite(site), success: true },
          message: `Site **${site.name}** is currently **${site.state || 'unknown'}**.`
        };
      }

      case 'create': {
        if (!name || !url)
          throw createApiServiceError('name and url are required for create action');
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
        if (!siteId) throw createApiServiceError('siteId is required for update action');
        requireUpdate(
          name,
          url,
          frequency,
          matchType,
          match,
          requestMethod,
          validateSsl,
          active
        );
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
        if (!siteId) throw createApiServiceError('siteId is required for delete action');
        await client.deleteSite(projectId, siteId);
        return {
          output: { success: true },
          message: `Deleted uptime check **${siteId}**.`
        };
      }

      default:
        throw createApiServiceError(`Unknown action: ${action}`);
    }
  })
  .build();
