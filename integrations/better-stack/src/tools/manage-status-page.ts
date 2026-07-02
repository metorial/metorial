import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let statusPageSchema = z.object({
  statusPageId: z.string().describe('Status page ID'),
  companyName: z.string().nullable().describe('Company name on the status page'),
  companyUrl: z.string().nullable().describe('Company website URL'),
  subdomain: z.string().nullable().describe('Status page subdomain'),
  customDomain: z.string().nullable().describe('Custom domain for the status page'),
  timezone: z.string().nullable().describe('Timezone'),
  subscribable: z.boolean().nullable().describe('Whether users can subscribe to updates'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let manageStatusPage = SlateTool.create(spec, {
  name: 'Manage Status Page',
  key: 'manage_status_page',
  description: `List, get, create, update, or delete public status pages. Status pages communicate system health to customers with ongoing incidents, planned maintenance, and service degradation information.`,
  instructions: [
    'Use action "list" to list all status pages.',
    'Use action "get" to get details of a specific status page.',
    'Use action "create" to create a new status page.',
    'Use action "update" to modify an existing status page.',
    'Use action "delete" to remove a status page.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      statusPageId: z
        .string()
        .optional()
        .describe('Status page ID (required for get, update, delete)'),
      companyName: z.string().optional().describe('Company name'),
      companyUrl: z.string().optional().describe('Company website URL'),
      subdomain: z.string().optional().describe('Status page subdomain'),
      customDomain: z.string().optional().describe('Custom domain'),
      timezone: z.string().optional().describe('Timezone (e.g., UTC, America/New_York)'),
      subscribable: z.boolean().optional().describe('Allow email subscriptions'),
      contactUrl: z.string().optional().describe('Contact URL for support'),
      logoUrl: z.string().optional().describe('Logo URL'),
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      statusPages: z.array(statusPageSchema).optional().describe('List of status pages'),
      statusPage: statusPageSchema.optional().describe('Single status page'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the status page was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { action, statusPageId } = ctx.input;

    let mapStatusPage = (item: any) => {
      let attrs = item.attributes || item;
      return {
        statusPageId: String(item.id),
        companyName: attrs.company_name || null,
        companyUrl: attrs.company_url || null,
        subdomain: attrs.subdomain || null,
        customDomain: attrs.custom_domain || null,
        timezone: attrs.timezone || null,
        subscribable: attrs.subscribable ?? null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listStatusPages({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let statusPages = (result.data || []).map(mapStatusPage);
      return {
        output: { statusPages, hasMore: !!result.pagination?.next },
        message: `Found **${statusPages.length}** status page(s).`
      };
    }

    if (action === 'get') {
      if (!statusPageId) throw new Error('statusPageId is required for get action');
      let result = await client.getStatusPage(statusPageId);
      return {
        output: { statusPage: mapStatusPage(result.data || result) },
        message: `Status page retrieved.`
      };
    }

    if (action === 'delete') {
      if (!statusPageId) throw new Error('statusPageId is required for delete action');
      await client.deleteStatusPage(statusPageId);
      return {
        output: { deleted: true },
        message: `Status page **${statusPageId}** deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.companyName) body.company_name = ctx.input.companyName;
    if (ctx.input.companyUrl) body.company_url = ctx.input.companyUrl;
    if (ctx.input.subdomain) body.subdomain = ctx.input.subdomain;
    if (ctx.input.customDomain) body.custom_domain = ctx.input.customDomain;
    if (ctx.input.timezone) body.timezone = ctx.input.timezone;
    if (ctx.input.subscribable !== undefined) body.subscribable = ctx.input.subscribable;
    if (ctx.input.contactUrl) body.contact_url = ctx.input.contactUrl;
    if (ctx.input.logoUrl) body.logo_url = ctx.input.logoUrl;

    let result: any;
    if (action === 'create') {
      result = await client.createStatusPage(body);
    } else {
      if (!statusPageId) throw new Error('statusPageId is required for update action');
      result = await client.updateStatusPage(statusPageId, body);
    }

    let sp = mapStatusPage(result.data || result);
    return {
      output: { statusPage: sp },
      message: `Status page **${sp.companyName || sp.statusPageId}** ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
