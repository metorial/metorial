import { SlateTool } from 'slates';
import { z } from 'zod';
import { SitesClient } from '../lib/client';
import { spec } from '../spec';

let trackerConfigSchema = z
  .object({
    outboundLinks: z.boolean().optional().describe('Track outbound link clicks'),
    fileDownloads: z.boolean().optional().describe('Track file downloads'),
    formSubmissions: z.boolean().optional().describe('Track form submissions'),
    track404Pages: z.boolean().optional().describe('Track 404 page visits'),
    hashBasedRouting: z.boolean().optional().describe('Enable hash-based routing'),
    revenueTracking: z.boolean().optional().describe('Enable revenue tracking'),
    taggedEvents: z.boolean().optional().describe('Enable tagged events'),
    pageviewProps: z.boolean().optional().describe('Enable pageview properties')
  })
  .optional()
  .describe('Tracker script configuration options');

let toApiTrackerConfig = (
  config?: z.infer<typeof trackerConfigSchema>
): Record<string, boolean> | undefined => {
  if (!config) return undefined;
  let result: Record<string, boolean> = {};
  if (config.outboundLinks !== undefined) result.outbound_links = config.outboundLinks;
  if (config.fileDownloads !== undefined) result.file_downloads = config.fileDownloads;
  if (config.formSubmissions !== undefined) result.form_submissions = config.formSubmissions;
  if (config.track404Pages !== undefined) result.track_404_pages = config.track404Pages;
  if (config.hashBasedRouting !== undefined)
    result.hash_based_routing = config.hashBasedRouting;
  if (config.revenueTracking !== undefined) result.revenue_tracking = config.revenueTracking;
  if (config.taggedEvents !== undefined) result.tagged_events = config.taggedEvents;
  if (config.pageviewProps !== undefined) result.pageview_props = config.pageviewProps;
  return Object.keys(result).length > 0 ? result : undefined;
};

export let createSite = SlateTool.create(spec, {
  name: 'Create Site',
  key: 'create_site',
  description: `Create a new site in your Plausible Analytics account. Configure the domain, timezone, and tracker script options. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('Globally unique domain for the site (e.g., "example.com")'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone name (e.g., "America/New_York"). Defaults to Etc/UTC.'),
      teamId: z.string().optional().describe('Team ID to associate the site with'),
      trackerConfig: trackerConfigSchema
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Domain of the created site'),
      timezone: z.string().describe('Timezone of the site'),
      customProperties: z
        .array(z.string())
        .optional()
        .describe('Custom properties configured for the site'),
      trackerScriptConfiguration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Tracker script configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createSite({
      domain: ctx.input.domain,
      timezone: ctx.input.timezone,
      teamId: ctx.input.teamId,
      trackerScriptConfiguration: toApiTrackerConfig(ctx.input.trackerConfig)
    });

    return {
      output: {
        domain: result.domain,
        timezone: result.timezone,
        customProperties: result.custom_properties,
        trackerScriptConfiguration: result.tracker_script_configuration
      },
      message: `Site **${result.domain}** created successfully with timezone **${result.timezone}**.`
    };
  })
  .build();

export let updateSite = SlateTool.create(spec, {
  name: 'Update Site',
  key: 'update_site',
  description: `Update an existing site in Plausible Analytics. Can change the domain name and/or update tracker script configuration. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Current domain of the site to update'),
      domain: z.string().optional().describe('New domain name for the site'),
      trackerConfig: trackerConfigSchema
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Domain of the updated site'),
      timezone: z.string().describe('Timezone of the site'),
      customProperties: z
        .array(z.string())
        .optional()
        .describe('Custom properties configured for the site'),
      trackerScriptConfiguration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Tracker script configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.updateSite(ctx.input.siteId, {
      domain: ctx.input.domain,
      trackerScriptConfiguration: toApiTrackerConfig(ctx.input.trackerConfig)
    });

    return {
      output: {
        domain: result.domain,
        timezone: result.timezone,
        customProperties: result.custom_properties,
        trackerScriptConfiguration: result.tracker_script_configuration
      },
      message: `Site **${result.domain}** updated successfully.`
    };
  })
  .build();

export let deleteSite = SlateTool.create(spec, {
  name: 'Delete Site',
  key: 'delete_site',
  description: `Delete a site from your Plausible Analytics account along with all its data. Data removal may take up to 48 hours. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the site was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteSite(ctx.input.siteId);

    return {
      output: {
        deleted: true
      },
      message: `Site **${ctx.input.siteId}** has been deleted. Data removal may take up to 48 hours.`
    };
  })
  .build();

export let getSite = SlateTool.create(spec, {
  name: 'Get Site',
  key: 'get_site',
  description: `Get details of a specific site including its tracker script configuration and custom properties. Requires a Sites API key (Enterprise plan).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site to retrieve')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Domain of the site'),
      timezone: z.string().describe('Timezone of the site'),
      customProperties: z
        .array(z.string())
        .optional()
        .describe('Custom properties configured for the site'),
      trackerScriptConfiguration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Tracker script configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getSite(ctx.input.siteId);

    return {
      output: {
        domain: result.domain,
        timezone: result.timezone,
        customProperties: result.custom_properties,
        trackerScriptConfiguration: result.tracker_script_configuration
      },
      message: `Retrieved details for site **${result.domain}** (timezone: ${result.timezone}).`
    };
  })
  .build();

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `List all sites accessible from your Plausible Analytics account. Supports pagination and filtering by team. Requires a Sites API key (Enterprise plan).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Filter sites by team ID'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of sites to return (default: 100)'),
      after: z.string().optional().describe('Pagination cursor for next page'),
      before: z.string().optional().describe('Pagination cursor for previous page')
    })
  )
  .output(
    z.object({
      sites: z
        .array(
          z.object({
            domain: z.string().describe('Domain of the site'),
            timezone: z.string().describe('Timezone of the site')
          })
        )
        .describe('List of sites'),
      meta: z.record(z.string(), z.any()).optional().describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listSites({
      teamId: ctx.input.teamId,
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let sites = (result.sites ?? result ?? []).map((s: any) => ({
      domain: s.domain,
      timezone: s.timezone
    }));

    return {
      output: {
        sites,
        meta: result.meta
      },
      message: `Found **${sites.length}** site(s).`
    };
  })
  .build();
