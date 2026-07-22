import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  LookerClient,
  type LookerScheduledPlan,
  type LookerScheduledPlanDestination,
  type LookerWriteScheduledPlan
} from '../lib/client';
import { spec } from '../spec';

let destinationInputSchema = z.object({
  format: z
    .string()
    .describe(
      'Output format. Supported formats include "txt", "csv", "inline_json", "json", "json_detail", "xlsx", "html", "wysiwyg_pdf", "assembled_pdf", and "wysiwyg_png"; valid formats depend on the source and destination type.'
    ),
  type: z.string().describe('Destination type: "email", "webhook", "s3", or "sftp"'),
  address: z
    .string()
    .nullable()
    .optional()
    .describe('Recipient email address, webhook URL, S3 URI, or SFTP URI'),
  applyFormatting: z.boolean().optional().describe('Whether to apply value formatting'),
  applyVis: z.boolean().optional().describe('Whether to apply visualization options'),
  parameters: z
    .string()
    .nullable()
    .optional()
    .describe(
      'JSON object for external scheduling parameters, such as S3 access_key_id and region or an SFTP username'
    ),
  secretParameters: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Write-only JSON object for external scheduling secrets, such as an S3 secret_access_key or SFTP password'
    ),
  message: z.string().nullable().optional().describe('Message for scheduled emails')
});

let destinationOutputSchema = z.object({
  destinationId: z.string().optional().describe('Scheduled plan destination ID'),
  scheduledPlanId: z.string().nullable().optional().describe('Owning scheduled plan ID'),
  format: z.string().nullable().optional().describe('Output format'),
  type: z.string().nullable().optional().describe('Destination type'),
  address: z.string().nullable().optional().describe('Destination address'),
  applyFormatting: z.boolean().optional().describe('Whether value formatting is applied'),
  applyVis: z.boolean().optional().describe('Whether visualization options are applied'),
  lookerRecipient: z
    .boolean()
    .optional()
    .describe('Whether an email recipient is a user on this Looker instance'),
  parameters: z.string().nullable().optional().describe('External scheduling parameters'),
  message: z.string().nullable().optional().describe('Scheduled email message')
});

let scheduledPlanOutputSchema = z.object({
  scheduledPlanId: z.string().describe('Scheduled plan ID'),
  name: z.string().nullable().optional().describe('Schedule name'),
  title: z.string().nullable().optional().describe('Scheduled content title'),
  userId: z.string().nullable().optional().describe('Owner user ID'),
  runAsRecipient: z
    .boolean()
    .optional()
    .describe('Whether email deliveries run in each recipient context'),
  lookId: z.string().nullable().optional().describe('Associated Look ID'),
  dashboardId: z.string().nullable().optional().describe('Associated dashboard ID'),
  lookmlDashboardId: z
    .string()
    .nullable()
    .optional()
    .describe('Associated LookML dashboard ID'),
  queryId: z.string().nullable().optional().describe('Associated query ID'),
  filtersString: z.string().nullable().optional().describe('Scheduled content filters'),
  requireResults: z.boolean().optional().describe('Whether delivery requires results'),
  requireNoResults: z.boolean().optional().describe('Whether delivery requires no results'),
  requireChange: z.boolean().optional().describe('Whether delivery requires changed data'),
  sendAllResults: z.boolean().optional().describe('Whether the query returns all results'),
  crontab: z.string().nullable().optional().describe('Vixie-style cron expression'),
  datagroup: z.string().nullable().optional().describe('Triggering datagroup name'),
  enabled: z.boolean().optional().describe('Whether the schedule is enabled'),
  runOnce: z.boolean().optional().describe('Whether the plan runs only once'),
  nextRunAt: z.string().nullable().optional().describe('Next scheduled run time'),
  lastRunAt: z.string().nullable().optional().describe('Last run time'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  timezone: z.string().nullable().optional().describe('Schedule timezone'),
  includeLinks: z.boolean().optional().describe('Whether deliveries include Looker links'),
  includeDashboardSummary: z
    .boolean()
    .optional()
    .describe('Whether scheduled emails include a dashboard summary'),
  customUrlBase: z.string().nullable().optional().describe('Custom URL domain'),
  customUrlParams: z.string().nullable().optional().describe('Custom URL path and parameters'),
  customUrlLabel: z.string().nullable().optional().describe('Custom URL label'),
  showCustomUrl: z.boolean().optional().describe('Whether to show the custom URL'),
  pdfPaperSize: z.string().nullable().optional().describe('PDF paper size'),
  pdfLandscape: z.boolean().optional().describe('Whether PDFs use landscape orientation'),
  embed: z.boolean().optional().describe('Whether the schedule runs in an embed context'),
  colorTheme: z.string().nullable().optional().describe('Dashboard color theme'),
  longTables: z.boolean().optional().describe('Whether table visualizations expand fully'),
  pdfPageBreaks: z.boolean().optional().describe('Whether PDFs break pages between tabs'),
  tabIds: z.array(z.string()).nullable().optional().describe('Dashboard tab IDs to render'),
  inlineTableWidth: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Inline table rendering width in pixels'),
  destinations: z
    .array(destinationOutputSchema)
    .nullable()
    .optional()
    .describe('Delivery destinations'),
  deleted: z.boolean().optional().describe('Whether the plan was permanently deleted')
});

let scheduledPlanInputSchema = z.object({
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
  name: z.string().nullable().optional().describe('Schedule name'),
  userId: z
    .string()
    .nullable()
    .optional()
    .describe('Owner user ID for writes or user filter for list actions'),
  allUsers: z
    .boolean()
    .optional()
    .describe(
      'For list actions, return plans belonging to all users; defaults to true when userId is omitted to preserve existing behavior and requires see_schedules permission'
    ),
  runAsRecipient: z
    .boolean()
    .optional()
    .describe('Run email schedules in each recipient context'),
  lookId: z.string().nullable().optional().describe('Look ID to schedule'),
  dashboardId: z.string().nullable().optional().describe('Dashboard ID to schedule'),
  lookmlDashboardId: z
    .string()
    .nullable()
    .optional()
    .describe('LookML dashboard ID to schedule'),
  queryId: z.string().nullable().optional().describe('Query ID to schedule'),
  crontab: z
    .string()
    .nullable()
    .optional()
    .describe('Vixie-style cron expression; mutually exclusive with datagroup'),
  datagroup: z
    .string()
    .nullable()
    .optional()
    .describe('Datagroup that triggers delivery; mutually exclusive with crontab'),
  destinations: z.array(destinationInputSchema).optional().describe('Delivery destinations'),
  filtersString: z.string().nullable().optional().describe('Query string for content filters'),
  requireResults: z.boolean().optional().describe('Deliver only when results exist'),
  requireNoResults: z.boolean().optional().describe('Deliver only when no results exist'),
  requireChange: z.boolean().optional().describe('Deliver only when data changed'),
  sendAllResults: z
    .boolean()
    .optional()
    .describe('Run an unlimited query and send all results'),
  includeLinks: z.boolean().optional().describe('Include links back to Looker'),
  includeDashboardSummary: z
    .boolean()
    .optional()
    .describe('Include a dashboard summary in scheduled emails'),
  timezone: z.string().nullable().optional().describe('Timezone used for crontab'),
  enabled: z.boolean().optional().describe('Whether the schedule is enabled'),
  customUrlBase: z.string().nullable().optional().describe('Custom URL domain'),
  customUrlParams: z.string().nullable().optional().describe('Custom URL path and parameters'),
  customUrlLabel: z.string().nullable().optional().describe('Custom URL label'),
  showCustomUrl: z
    .boolean()
    .optional()
    .describe('Show the custom link instead of the standard link'),
  pdfPaperSize: z
    .enum(['letter', 'legal', 'tabloid', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5'])
    .nullable()
    .optional()
    .describe('PDF paper size'),
  pdfLandscape: z.boolean().optional().describe('Render PDFs in landscape orientation'),
  embed: z.boolean().optional().describe('Run the schedule in an embed context'),
  colorTheme: z.string().nullable().optional().describe('Dashboard color theme'),
  longTables: z.boolean().optional().describe('Expand table visualizations to full length'),
  pdfPageBreaks: z.boolean().optional().describe('Add page breaks between dashboard tabs'),
  tabIds: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Dashboard tab IDs or LookML dashboard tab labels to render'),
  inlineTableWidth: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Inline table visualization width in pixels')
});

type ScheduledPlanInput = z.infer<typeof scheduledPlanInputSchema>;
type DestinationInput = z.infer<typeof destinationInputSchema>;

let optionalId = (value: unknown) => {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return String(value);
};

let nullableString = (value: unknown) => {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
};

let optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

let mapDestination = (destination: LookerScheduledPlanDestination) => ({
  destinationId: optionalId(destination.id) ?? undefined,
  scheduledPlanId: optionalId(destination.scheduled_plan_id),
  format: nullableString(destination.format),
  type: nullableString(destination.type),
  address: nullableString(destination.address),
  applyFormatting: optionalBoolean(destination.apply_formatting),
  applyVis: optionalBoolean(destination.apply_vis),
  lookerRecipient: optionalBoolean(destination.looker_recipient),
  parameters: nullableString(destination.parameters),
  message: nullableString(destination.message)
});

let mapPlan = (plan: LookerScheduledPlan) => {
  if (plan?.id === undefined || plan.id === null || String(plan.id).length === 0) {
    throw createApiServiceError('Looker returned a scheduled plan without an ID.', {
      reason: 'looker_scheduled_plan_response_invalid'
    });
  }

  let destinations =
    plan.scheduled_plan_destination === null
      ? null
      : Array.isArray(plan.scheduled_plan_destination)
        ? plan.scheduled_plan_destination.map(mapDestination)
        : undefined;

  let tabIds =
    plan.tab_ids === null
      ? null
      : Array.isArray(plan.tab_ids)
        ? plan.tab_ids.map(String)
        : undefined;

  return {
    scheduledPlanId: String(plan.id),
    name: nullableString(plan.name),
    title: nullableString(plan.title),
    userId: optionalId(plan.user_id),
    runAsRecipient: optionalBoolean(plan.run_as_recipient),
    lookId: optionalId(plan.look_id),
    dashboardId: optionalId(plan.dashboard_id),
    lookmlDashboardId: optionalId(plan.lookml_dashboard_id),
    queryId: optionalId(plan.query_id),
    filtersString: nullableString(plan.filters_string),
    requireResults: optionalBoolean(plan.require_results),
    requireNoResults: optionalBoolean(plan.require_no_results),
    requireChange: optionalBoolean(plan.require_change),
    sendAllResults: optionalBoolean(plan.send_all_results),
    crontab: nullableString(plan.crontab),
    datagroup: nullableString(plan.datagroup),
    enabled: optionalBoolean(plan.enabled),
    runOnce: optionalBoolean(plan.run_once),
    nextRunAt: nullableString(plan.next_run_at),
    lastRunAt: nullableString(plan.last_run_at),
    createdAt: nullableString(plan.created_at),
    updatedAt: nullableString(plan.updated_at),
    timezone: nullableString(plan.timezone),
    includeLinks: optionalBoolean(plan.include_links),
    includeDashboardSummary: optionalBoolean(plan.include_dashboard_summary),
    customUrlBase: nullableString(plan.custom_url_base),
    customUrlParams: nullableString(plan.custom_url_params),
    customUrlLabel: nullableString(plan.custom_url_label),
    showCustomUrl: optionalBoolean(plan.show_custom_url),
    pdfPaperSize: nullableString(plan.pdf_paper_size),
    pdfLandscape: optionalBoolean(plan.pdf_landscape),
    embed: optionalBoolean(plan.embed),
    colorTheme: nullableString(plan.color_theme),
    longTables: optionalBoolean(plan.long_tables),
    pdfPageBreaks: optionalBoolean(plan.pdf_page_breaks),
    tabIds,
    inlineTableWidth:
      plan.inline_table_width === null
        ? null
        : typeof plan.inline_table_width === 'number'
          ? plan.inline_table_width
          : undefined,
    destinations
  };
};

let mapDestinations = (destinations: DestinationInput[] | undefined) =>
  destinations?.map(destination => ({
    format: destination.format,
    type: destination.type,
    address: destination.address,
    apply_formatting: destination.applyFormatting,
    apply_vis: destination.applyVis,
    parameters: destination.parameters,
    secret_parameters: destination.secretParameters,
    message: destination.message
  }));

let buildWriteBody = (input: ScheduledPlanInput): LookerWriteScheduledPlan => ({
  name: input.name,
  user_id: input.userId,
  run_as_recipient: input.runAsRecipient,
  enabled: input.enabled,
  look_id: input.lookId,
  dashboard_id: input.dashboardId,
  lookml_dashboard_id: input.lookmlDashboardId,
  query_id: input.queryId,
  filters_string: input.filtersString,
  require_results: input.requireResults,
  require_no_results: input.requireNoResults,
  require_change: input.requireChange,
  send_all_results: input.sendAllResults,
  crontab: input.crontab,
  datagroup: input.datagroup,
  timezone: input.timezone,
  scheduled_plan_destination: mapDestinations(input.destinations),
  include_links: input.includeLinks,
  include_dashboard_summary: input.includeDashboardSummary,
  custom_url_base: input.customUrlBase,
  custom_url_params: input.customUrlParams,
  custom_url_label: input.customUrlLabel,
  show_custom_url: input.showCustomUrl,
  pdf_paper_size: input.pdfPaperSize,
  pdf_landscape: input.pdfLandscape,
  embed: input.embed,
  color_theme: input.colorTheme,
  long_tables: input.longTables,
  pdf_page_breaks: input.pdfPageBreaks,
  tab_ids: input.tabIds,
  inline_table_width: input.inlineTableWidth
});

let sourceValues = (input: ScheduledPlanInput) =>
  [input.lookId, input.dashboardId, input.lookmlDashboardId, input.queryId].filter(
    value => typeof value === 'string' && value.length > 0
  );

let requireOneSource = (input: ScheduledPlanInput, action: 'create' | 'run_once') => {
  if (sourceValues(input).length !== 1) {
    throw createApiServiceError(
      `Exactly one of lookId, dashboardId, lookmlDashboardId, or queryId is required for ${action} action.`,
      { reason: 'looker_scheduled_plan_source_required' }
    );
  }
};

let validateSourceUpdate = (input: ScheduledPlanInput) => {
  if (sourceValues(input).length > 1) {
    throw createApiServiceError(
      'At most one of lookId, dashboardId, lookmlDashboardId, or queryId can be non-null for update action.',
      { reason: 'looker_scheduled_plan_source_conflict' }
    );
  }
};

let nonEmptyRecurrences = (input: ScheduledPlanInput) =>
  [input.crontab, input.datagroup].filter(
    value => typeof value === 'string' && value.length > 0
  );

let validateListScope = (input: ScheduledPlanInput) => {
  if (input.allUsers === true && typeof input.userId === 'string') {
    throw createApiServiceError(
      'Use either userId or allUsers=true for list actions, not both.',
      {
        reason: 'looker_scheduled_plan_list_scope_conflict'
      }
    );
  }

  return {
    user_id: typeof input.userId === 'string' ? input.userId : undefined,
    all_users: input.allUsers ?? (typeof input.userId === 'string' ? undefined : true)
  };
};

let requireScheduledPlanId = (scheduledPlanId: string | undefined, action: string) => {
  if (!scheduledPlanId) {
    throw createApiServiceError(`scheduledPlanId is required for ${action} action.`, {
      reason: 'looker_scheduled_plan_id_required'
    });
  }
  return scheduledPlanId;
};

let requireDestinations = (input: ScheduledPlanInput, action: 'create' | 'run_once') => {
  if (!input.destinations || input.destinations.length === 0) {
    throw createApiServiceError(`At least one destination is required for ${action} action.`, {
      reason: 'looker_scheduled_plan_destination_required'
    });
  }
};

let hasScheduledPlanUpdate = (input: ScheduledPlanInput) =>
  [
    input.name,
    input.userId,
    input.runAsRecipient,
    input.enabled,
    input.lookId,
    input.dashboardId,
    input.lookmlDashboardId,
    input.queryId,
    input.filtersString,
    input.requireResults,
    input.requireNoResults,
    input.requireChange,
    input.sendAllResults,
    input.crontab,
    input.datagroup,
    input.timezone,
    input.destinations,
    input.includeLinks,
    input.includeDashboardSummary,
    input.customUrlBase,
    input.customUrlParams,
    input.customUrlLabel,
    input.showCustomUrl,
    input.pdfPaperSize,
    input.pdfLandscape,
    input.embed,
    input.colorTheme,
    input.longTables,
    input.pdfPageBreaks,
    input.tabIds,
    input.inlineTableWidth
  ].some(value => value !== undefined);

let validatePlanList = (plans: unknown): LookerScheduledPlan[] => {
  if (!Array.isArray(plans)) {
    throw createApiServiceError('Looker returned an invalid scheduled plan list.', {
      reason: 'looker_scheduled_plan_list_response_invalid'
    });
  }
  return plans;
};

let planLabel = (plan: ReturnType<typeof mapPlan>) =>
  plan.name ?? plan.title ?? plan.scheduledPlanId;

export let manageScheduledPlan = SlateTool.create(spec, {
  name: 'Manage Scheduled Plan',
  key: 'manage_scheduled_plan',
  description: `Get, create, update, permanently delete, or list scheduled content delivery plans, and create plans that run once immediately. Scheduled plans automate delivery of Look, dashboard, LookML dashboard, or query results via email, webhooks, S3, or SFTP.`,
  instructions: [
    'To list plans: set action to "list". Existing behavior lists all users by default; set allUsers to false for the caller\'s plans or provide userId for one user.',
    'To list plans for a Look or dashboard: set action to "list_for_look" with lookId or "list_for_dashboard" with dashboardId. The same allUsers and userId filters apply.',
    'To get a plan: set action to "get" with scheduledPlanId.',
    'To create: set action to "create" with name, exactly one of lookId/dashboardId/lookmlDashboardId/queryId, exactly one of crontab/datagroup, and at least one destination.',
    'For a Look schedule, requireResults, requireNoResults, and requireChange must all be provided; false is a valid value.',
    'To update: set action to "update" with scheduledPlanId and fields to change. Passing destinations replaces all current destinations; an empty destination array is invalid. Use null to clear nullable fields when switching a source or recurrence.',
    'To permanently delete (there is no undo): set action to "delete" with scheduledPlanId.',
    'To run once immediately: set action to "run_once" with name, exactly one content source, and at least one destination.'
  ]
})
  .input(scheduledPlanInputSchema)
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

    switch (ctx.input.action) {
      case 'get': {
        let scheduledPlanId = requireScheduledPlanId(ctx.input.scheduledPlanId, 'get');
        let plan = mapPlan(await client.getScheduledPlan(scheduledPlanId));
        return {
          output: { plan },
          message: `Retrieved scheduled plan **${planLabel(plan)}**`
        };
      }
      case 'list': {
        let plans = validatePlanList(
          await client.listScheduledPlans(validateListScope(ctx.input))
        ).map(mapPlan);
        return {
          output: { plans, count: plans.length },
          message: `Found **${plans.length}** scheduled plan(s)`
        };
      }
      case 'list_for_look': {
        if (!ctx.input.lookId) {
          throw createApiServiceError('lookId is required for list_for_look action.', {
            reason: 'looker_scheduled_plan_look_id_required'
          });
        }
        let plans = validatePlanList(
          await client.getScheduledPlansForLook(ctx.input.lookId, validateListScope(ctx.input))
        ).map(mapPlan);
        return {
          output: { plans, count: plans.length },
          message: `Found **${plans.length}** scheduled plan(s) for Look ${ctx.input.lookId}`
        };
      }
      case 'list_for_dashboard': {
        if (!ctx.input.dashboardId) {
          throw createApiServiceError(
            'dashboardId is required for list_for_dashboard action.',
            { reason: 'looker_scheduled_plan_dashboard_id_required' }
          );
        }
        let plans = validatePlanList(
          await client.getScheduledPlansForDashboard(
            ctx.input.dashboardId,
            validateListScope(ctx.input)
          )
        ).map(mapPlan);
        return {
          output: { plans, count: plans.length },
          message: `Found **${plans.length}** scheduled plan(s) for dashboard ${ctx.input.dashboardId}`
        };
      }
      case 'create': {
        if (typeof ctx.input.name !== 'string' || ctx.input.name.length === 0) {
          throw createApiServiceError('name is required for create action.', {
            reason: 'looker_scheduled_plan_name_required'
          });
        }
        requireDestinations(ctx.input, 'create');
        requireOneSource(ctx.input, 'create');
        if (nonEmptyRecurrences(ctx.input).length !== 1) {
          throw createApiServiceError(
            'Exactly one of crontab or datagroup is required for create action.',
            { reason: 'looker_scheduled_plan_recurrence_required' }
          );
        }
        if (
          typeof ctx.input.lookId === 'string' &&
          (ctx.input.requireResults === undefined ||
            ctx.input.requireNoResults === undefined ||
            ctx.input.requireChange === undefined)
        ) {
          throw createApiServiceError(
            'Look schedules require requireResults, requireNoResults, and requireChange; each may be true or false.',
            { reason: 'looker_scheduled_plan_look_conditions_required' }
          );
        }
        let plan = mapPlan(await client.createScheduledPlan(buildWriteBody(ctx.input)));
        return {
          output: { plan },
          message: `Created scheduled plan **${planLabel(plan)}** (ID: ${plan.scheduledPlanId})`
        };
      }
      case 'update': {
        let scheduledPlanId = requireScheduledPlanId(ctx.input.scheduledPlanId, 'update');
        if (!hasScheduledPlanUpdate(ctx.input)) {
          throw createApiServiceError('Provide at least one scheduled plan field to update.', {
            reason: 'looker_scheduled_plan_update_fields_required'
          });
        }
        validateSourceUpdate(ctx.input);
        if (nonEmptyRecurrences(ctx.input).length > 1) {
          throw createApiServiceError(
            'crontab and datagroup cannot both be non-null for update action.',
            { reason: 'looker_scheduled_plan_recurrence_conflict' }
          );
        }
        if (ctx.input.destinations !== undefined && ctx.input.destinations.length === 0) {
          throw createApiServiceError(
            'destinations cannot be empty for update action because a scheduled plan must retain at least one destination.',
            { reason: 'looker_scheduled_plan_empty_destinations' }
          );
        }
        let plan = mapPlan(
          await client.updateScheduledPlan(scheduledPlanId, buildWriteBody(ctx.input))
        );
        return {
          output: { plan },
          message: `Updated scheduled plan **${planLabel(plan)}**`
        };
      }
      case 'delete': {
        let scheduledPlanId = requireScheduledPlanId(ctx.input.scheduledPlanId, 'delete');
        let plan = mapPlan(await client.getScheduledPlan(scheduledPlanId));
        await client.deleteScheduledPlan(scheduledPlanId);
        let deletedPlan = { ...plan, deleted: true };
        return {
          output: { plan: deletedPlan },
          message: `Permanently deleted scheduled plan **${planLabel(plan)}** (ID: ${scheduledPlanId})`
        };
      }
      case 'run_once': {
        if (typeof ctx.input.name !== 'string' || ctx.input.name.length === 0) {
          throw createApiServiceError('name is required for run_once action.', {
            reason: 'looker_scheduled_plan_name_required'
          });
        }
        requireDestinations(ctx.input, 'run_once');
        requireOneSource(ctx.input, 'run_once');
        let plan = mapPlan(await client.runScheduledPlanOnce(buildWriteBody(ctx.input)));
        return {
          output: { plan },
          message: `Triggered one-time scheduled plan **${planLabel(plan)}** (ID: ${plan.scheduledPlanId})`
        };
      }
    }
  })
  .build();
