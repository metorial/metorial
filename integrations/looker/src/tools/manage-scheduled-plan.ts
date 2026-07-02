import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let destinationSchema = z.object({
  format: z
    .string()
    .describe(
      'Output format (e.g., "csv", "xlsx", "inline_json", "txt", "html", "wysiwyg_pdf", "assembled_pdf", "wysiwyg_png")'
    ),
  type: z.string().describe('Destination type (e.g., "email", "webhook", "sftp", "s3")'),
  address: z.string().optional().describe('Destination address (email address or URL)'),
  applyFormatting: z.boolean().optional().describe('Whether to apply formatting'),
  applyVis: z.boolean().optional().describe('Whether to apply visualization'),
  message: z.string().optional().describe('Optional message body')
});

let scheduledPlanOutputSchema = z.object({
  scheduledPlanId: z.string().describe('Scheduled plan ID'),
  name: z.string().optional().describe('Schedule name'),
  lookId: z.string().optional().describe('Associated Look ID'),
  dashboardId: z.string().optional().describe('Associated dashboard ID'),
  lookmlDashboardId: z.string().optional().describe('Associated LookML dashboard ID'),
  crontab: z.string().optional().describe('Cron expression for schedule'),
  enabled: z.boolean().optional().describe('Whether the schedule is enabled'),
  nextRunAt: z.string().optional().describe('Next scheduled run time'),
  lastRunAt: z.string().optional().describe('Last run time'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  timezone: z.string().optional().describe('Schedule timezone'),
  destinations: z.array(destinationSchema).optional().describe('Delivery destinations')
});

export let manageScheduledPlan = SlateTool.create(spec, {
  name: 'Manage Scheduled Plan',
  key: 'manage_scheduled_plan',
  description: `Get, create, update, delete, or list scheduled content delivery plans. Scheduled plans automate the delivery of Look or dashboard results via email, webhooks, S3, SFTP, and more.`,
  instructions: [
    'To list all plans: set action to "list".',
    'To list plans for a Look: set action to "list_for_look" with lookId.',
    'To list plans for a dashboard: set action to "list_for_dashboard" with dashboardId.',
    'To get a plan: set action to "get" with scheduledPlanId.',
    'To create: set action to "create" with name, content source (lookId or dashboardId), destinations, and crontab.',
    'To update: set action to "update" with scheduledPlanId and fields to change.',
    'To delete: set action to "delete" with scheduledPlanId.',
    'To run once immediately: set action to "run_once" with name, content source, and destinations.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'get',
          'list',
          'list_for_look',
          'list_for_dashboard',
          'create',
          'update',
          'delete',
          'run_once'
        ])
        .describe('Action to perform'),
      scheduledPlanId: z.string().optional().describe('Scheduled plan ID'),
      name: z.string().optional().describe('Schedule name'),
      lookId: z.string().optional().describe('Look ID to schedule'),
      dashboardId: z.string().optional().describe('Dashboard ID to schedule'),
      lookmlDashboardId: z.string().optional().describe('LookML dashboard ID to schedule'),
      crontab: z
        .string()
        .optional()
        .describe('Cron expression (e.g., "0 9 * * 1" for Mondays at 9am)'),
      destinations: z.array(destinationSchema).optional().describe('Delivery destinations'),
      filtersString: z.string().optional().describe('URL-encoded filter string'),
      requireResults: z.boolean().optional().describe('Only send if results exist'),
      requireNoResults: z.boolean().optional().describe('Only send if no results'),
      requireChange: z.boolean().optional().describe('Only send if results changed'),
      sendAllResults: z.boolean().optional().describe('Send all results'),
      includeLinks: z.boolean().optional().describe('Include links in notification'),
      timezone: z.string().optional().describe('Schedule timezone'),
      enabled: z.boolean().optional().describe('Whether the schedule is enabled')
    })
  )
  .output(
    z.object({
      plan: scheduledPlanOutputSchema.optional().describe('Scheduled plan details'),
      plans: z.array(scheduledPlanOutputSchema).optional().describe('List of scheduled plans'),
      count: z.number().optional().describe('Number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let mapPlan = (p: any) => ({
      scheduledPlanId: String(p.id),
      name: p.name,
      lookId: p.look_id ? String(p.look_id) : undefined,
      dashboardId: p.dashboard_id ? String(p.dashboard_id) : undefined,
      lookmlDashboardId: p.lookml_dashboard_id,
      crontab: p.crontab,
      enabled: p.enabled,
      nextRunAt: p.next_run_at,
      lastRunAt: p.last_run_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      timezone: p.timezone,
      destinations: p.scheduled_plan_destination?.map((d: any) => ({
        format: d.format,
        type: d.type,
        address: d.address,
        applyFormatting: d.apply_formatting,
        applyVis: d.apply_vis,
        message: d.message
      }))
    });

    let mapDestinations = (dests: typeof ctx.input.destinations) =>
      dests?.map(d => ({
        format: d.format,
        type: d.type,
        address: d.address,
        apply_formatting: d.applyFormatting,
        apply_vis: d.applyVis,
        message: d.message
      }));

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.scheduledPlanId) throw new Error('scheduledPlanId is required');
        let plan = await client.getScheduledPlan(ctx.input.scheduledPlanId);
        return {
          output: { plan: mapPlan(plan) },
          message: `Retrieved scheduled plan **${plan.name}**`
        };
      }
      case 'list': {
        let plans = await client.listScheduledPlans({ all_users: true });
        return {
          output: { plans: (plans || []).map(mapPlan), count: plans.length },
          message: `Found **${plans.length}** scheduled plan(s)`
        };
      }
      case 'list_for_look': {
        if (!ctx.input.lookId) throw new Error('lookId is required');
        let plans = await client.getScheduledPlansForLook(ctx.input.lookId, {
          all_users: true
        });
        return {
          output: { plans: (plans || []).map(mapPlan), count: plans.length },
          message: `Found **${plans.length}** scheduled plan(s) for Look ${ctx.input.lookId}`
        };
      }
      case 'list_for_dashboard': {
        if (!ctx.input.dashboardId) throw new Error('dashboardId is required');
        let plans = await client.getScheduledPlansForDashboard(ctx.input.dashboardId, {
          all_users: true
        });
        return {
          output: { plans: (plans || []).map(mapPlan), count: plans.length },
          message: `Found **${plans.length}** scheduled plan(s) for dashboard ${ctx.input.dashboardId}`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        if (!ctx.input.destinations || ctx.input.destinations.length === 0)
          throw new Error('At least one destination is required');
        let plan = await client.createScheduledPlan({
          name: ctx.input.name,
          look_id: ctx.input.lookId,
          dashboard_id: ctx.input.dashboardId,
          lookml_dashboard_id: ctx.input.lookmlDashboardId,
          crontab: ctx.input.crontab,
          scheduled_plan_destination: mapDestinations(ctx.input.destinations) as any,
          filters_string: ctx.input.filtersString,
          require_results: ctx.input.requireResults,
          require_no_results: ctx.input.requireNoResults,
          require_change: ctx.input.requireChange,
          send_all_results: ctx.input.sendAllResults,
          include_links: ctx.input.includeLinks,
          timezone: ctx.input.timezone,
          enabled: ctx.input.enabled
        });
        return {
          output: { plan: mapPlan(plan) },
          message: `Created scheduled plan **${plan.name}** (ID: ${plan.id})`
        };
      }
      case 'update': {
        if (!ctx.input.scheduledPlanId) throw new Error('scheduledPlanId is required');
        let updateBody: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateBody.name = ctx.input.name;
        if (ctx.input.crontab !== undefined) updateBody.crontab = ctx.input.crontab;
        if (ctx.input.enabled !== undefined) updateBody.enabled = ctx.input.enabled;
        if (ctx.input.timezone !== undefined) updateBody.timezone = ctx.input.timezone;
        if (ctx.input.destinations !== undefined)
          updateBody.scheduled_plan_destination = mapDestinations(ctx.input.destinations);
        if (ctx.input.filtersString !== undefined)
          updateBody.filters_string = ctx.input.filtersString;
        if (ctx.input.requireResults !== undefined)
          updateBody.require_results = ctx.input.requireResults;
        if (ctx.input.requireNoResults !== undefined)
          updateBody.require_no_results = ctx.input.requireNoResults;
        if (ctx.input.requireChange !== undefined)
          updateBody.require_change = ctx.input.requireChange;
        if (ctx.input.sendAllResults !== undefined)
          updateBody.send_all_results = ctx.input.sendAllResults;
        if (ctx.input.includeLinks !== undefined)
          updateBody.include_links = ctx.input.includeLinks;
        let plan = await client.updateScheduledPlan(ctx.input.scheduledPlanId, updateBody);
        return {
          output: { plan: mapPlan(plan) },
          message: `Updated scheduled plan **${plan.name}**`
        };
      }
      case 'delete': {
        if (!ctx.input.scheduledPlanId) throw new Error('scheduledPlanId is required');
        let plan = await client.getScheduledPlan(ctx.input.scheduledPlanId);
        await client.deleteScheduledPlan(ctx.input.scheduledPlanId);
        return {
          output: { plan: mapPlan(plan) },
          message: `Deleted scheduled plan **${plan.name}** (ID: ${ctx.input.scheduledPlanId})`
        };
      }
      case 'run_once': {
        if (!ctx.input.name) throw new Error('name is required');
        if (!ctx.input.destinations || ctx.input.destinations.length === 0)
          throw new Error('At least one destination is required');
        let plan = await client.runScheduledPlanOnce({
          name: ctx.input.name,
          look_id: ctx.input.lookId,
          dashboard_id: ctx.input.dashboardId,
          lookml_dashboard_id: ctx.input.lookmlDashboardId,
          scheduled_plan_destination: mapDestinations(ctx.input.destinations),
          filters_string: ctx.input.filtersString,
          timezone: ctx.input.timezone
        });
        return {
          output: { plan: mapPlan(plan) },
          message: `Triggered one-time scheduled plan **${ctx.input.name}**`
        };
      }
    }
  })
  .build();
