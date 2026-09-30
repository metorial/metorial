import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';
import { type ApiRecord, ContextClient, pathId } from '../lib/client';
import { responseMetadata } from '../lib/response';
import { contextTool } from '../lib/tools';

const targetTypeSchema = z.enum(['page', 'sitemap', 'extract']);
const detectionTypeSchema = z.enum(['exact', 'semantic']);
const runStatusSchema = z.enum(['queued', 'running', 'completed', 'failed', 'skipped']);
const monitorErrorSchema = z.object({ code: z.string(), message: z.string() }).passthrough();
const webhookConfigSchema = z
  .object({
    url: z.string(),
    events: z
      .array(z.enum(['change.detected', 'run.completed']))
      .min(1)
      .max(2)
      .optional(),
    retry: z
      .object({ delays_seconds: z.array(z.number().int()).optional() })
      .passthrough()
      .optional(),
    secret: z.string().optional()
  })
  .passthrough();

const monitorSchema = z
  .object({
    mode: z.literal('web'),
    id: z.string(),
    name: z.string(),
    target: z
      .object({
        type: targetTypeSchema,
        url: z.string(),
        instructions: z.string().optional(),
        include_selectors: z.array(z.string()).optional(),
        exclude_selectors: z.array(z.string()).optional(),
        actions: z
          .array(z.object({ do: z.enum(['wait', 'perform', 'scroll']) }).passthrough())
          .nullish(),
        schema: z.record(z.string(), z.unknown()).optional(),
        include: z.array(z.string()).optional(),
        exclude: z.array(z.string()).optional(),
        max_urls: z.number().int().optional(),
        max_pages: z.number().int().optional(),
        max_depth: z.number().int().optional(),
        follow_subdomains: z.boolean().optional()
      })
      .passthrough(),
    change_detection: z
      .object({
        type: detectionTypeSchema,
        confidence_threshold: z.number().optional()
      })
      .passthrough(),
    schedule: z
      .object({
        type: z.literal('interval'),
        frequency: z.number().int(),
        unit: z.enum(['minutes', 'hours', 'days'])
      })
      .passthrough()
      .optional(),
    webhook: webhookConfigSchema.nullish(),
    status: z.enum(['active', 'paused', 'failed']),
    last_run_at: z.string().nullish(),
    last_change_at: z.string().nullish(),
    next_run_at: z.string().nullish(),
    last_error: monitorErrorSchema.nullish(),
    webhook_failure: z
      .object({
        consecutive_failures: z.number().int(),
        last_status: z.enum(['rejected', 'failed', 'skipped_unsafe_url']),
        last_message: z.string(),
        last_failed_at: z.string()
      })
      .passthrough()
      .nullish(),
    created_at: z.string(),
    updated_at: z.string(),
    tags: z.array(z.string()).optional(),
    baseline: z
      .object({
        captured_at: z.string(),
        text: z.string().optional(),
        urls: z.array(z.string()).optional(),
        url_count: z.number().int().optional(),
        data: z.unknown().optional(),
        urls_analyzed: z.array(z.string()).optional()
      })
      .passthrough()
      .nullish()
  })
  .passthrough();

const monitorResponseSchema = monitorSchema.extend(responseMetadata);
const createMonitorSchema = monitorResponseSchema.extend({
  initial_run_id: z.string().nullable()
});
const paginationShape = {
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
  ...responseMetadata
};
const listMonitorsSchema = z
  .object({ data: z.array(monitorSchema), ...paginationShape })
  .passthrough();

const validateMonitorSettings = (input: ApiRecord) => {
  if (input.schedule) {
    const multiplier = { minutes: 1, hours: 60, days: 1440 }[
      input.schedule.unit as 'minutes' | 'hours' | 'days'
    ];
    const minutes = input.schedule.frequency * multiplier;
    if (minutes < 10 || minutes > 525600) {
      throw createApiServiceError(
        'The monitor schedule interval must be between 10 minutes and 1 year. Adjust frequency and unit.'
      );
    }
  }
  if (input.webhook !== undefined && input.webhook !== null) {
    const parsed = webhookConfigSchema.safeParse(input.webhook);
    if (!parsed.success) {
      throw createApiServiceError(
        'Provide a webhook configuration with a URL, or null to remove the webhook.'
      );
    }
    const delays: number[] | undefined = parsed.data.retry?.delays_seconds;
    if (
      delays &&
      (delays.length > 10 ||
        delays.some(delay => delay < 1 || delay > 86400) ||
        delays.reduce((sum, delay) => sum + delay, 0) > 259200)
    ) {
      throw createApiServiceError(
        'Webhook retry delays must contain at most 10 values of 1–86400 seconds, totaling no more than 72 hours.'
      );
    }
  }
};

const validateTimeWindow = (input: ApiRecord) => {
  if (input.since && input.until && Date.parse(input.since) > Date.parse(input.until)) {
    throw createApiServiceError('since must be before or equal to until.');
  }
};

const createMonitor = contextTool('create-monitor')
  .output(createMonitorSchema)
  .handleInvocation(async ctx => {
    validateMonitorSettings(ctx.input);
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof createMonitorSchema>
    >('create monitor', { method: 'POST', path: '/monitors', body: ctx.input });
    return {
      output,
      message: `Created monitor ${output.id}${output.initial_run_id ? ` with initial run ${output.initial_run_id}` : ''}.`
    };
  })
  .build();

const listMonitors = contextTool('list-monitors')
  .output(listMonitorsSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listMonitorsSchema>
    >('list monitors', { method: 'GET', path: '/monitors', query: ctx.input });
    return { output, message: `Retrieved ${output.data.length} monitors.` };
  })
  .build();

const getMonitor = contextTool('get-monitor')
  .output(monitorResponseSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof monitorResponseSchema>
    >('retrieve monitor', {
      method: 'GET',
      path: `/monitors/${pathId(ctx.input.monitor_id)}`
    });
    return { output, message: `Retrieved monitor ${output.id} with status ${output.status}.` };
  })
  .build();

const updateMonitor = contextTool('update-monitor')
  .output(monitorResponseSchema)
  .handleInvocation(async ctx => {
    validateMonitorSettings(ctx.input);
    const body = pickDefined({
      name: ctx.input.name,
      tags: ctx.input.tags,
      status: ctx.input.status,
      target: ctx.input.target,
      change_detection: ctx.input.change_detection,
      schedule: ctx.input.schedule,
      webhook: ctx.input.webhook
    });
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof monitorResponseSchema>
    >('update monitor', {
      method: 'PATCH',
      path: `/monitors/${pathId(ctx.input.monitor_id)}`,
      body
    });
    return { output, message: `Updated monitor ${output.id} with status ${output.status}.` };
  })
  .build();

const deleteMonitorSchema = z
  .object({ id: z.string(), deleted: z.boolean(), ...responseMetadata })
  .passthrough();
const deleteMonitor = contextTool('delete-monitor')
  .output(deleteMonitorSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof deleteMonitorSchema>
    >('delete monitor', {
      method: 'DELETE',
      path: `/monitors/${pathId(ctx.input.monitor_id)}`
    });
    return {
      output,
      message: output.deleted
        ? `Deleted monitor ${output.id}.`
        : `Monitor ${output.id} was not deleted.`
    };
  })
  .build();

const monitorLimitsSchema = z
  .object({
    monitors_used: z.number().int(),
    monitors_limit: z.number().int(),
    plan: z.enum(['free', 'starter', 'pro', 'scale']),
    ...responseMetadata
  })
  .passthrough();
const getMonitorLimits = contextTool('get-monitor-limits')
  .output(monitorLimitsSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof monitorLimitsSchema>
    >('retrieve monitor limits', { method: 'GET', path: '/monitors/limits' });
    return {
      output,
      message: `Using ${output.monitors_used} of ${output.monitors_limit} monitors on the ${output.plan} plan.`
    };
  })
  .build();

const monitorCreditUsageSchema = z
  .object({
    data: z.array(
      z
        .object({
          monitor_id: z.string(),
          name: z.string(),
          credits: z.number().int(),
          runs: z.number().int()
        })
        .passthrough()
    ),
    total_credits: z.number().int(),
    ...responseMetadata
  })
  .passthrough();
const listMonitorCreditUsage = contextTool('list-monitor-credit-usage')
  .output(monitorCreditUsageSchema)
  .handleInvocation(async ctx => {
    validateTimeWindow(ctx.input);
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof monitorCreditUsageSchema>
    >('retrieve monitor credit usage', {
      method: 'GET',
      path: '/monitors/credit-usage',
      query: ctx.input
    });
    return {
      output,
      message: `Retrieved monitor usage totaling ${output.total_credits} credits.`
    };
  })
  .build();

const runNowSchema = z
  .object({
    monitor_id: z.string(),
    run_id: z.string(),
    queued: z.boolean(),
    ...responseMetadata
  })
  .passthrough();
const runMonitorNow = contextTool('run-monitor-now')
  .output(runNowSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof runNowSchema>
    >('run monitor immediately', {
      method: 'POST',
      path: `/monitors/${pathId(ctx.input.monitor_id)}/run`
    });
    return {
      output,
      message: output.queued
        ? `Queued run ${output.run_id} for monitor ${output.monitor_id}.`
        : `Run ${output.run_id} was not queued.`
    };
  })
  .build();

const monitorWebhookDeliverySchema = z
  .object({
    delivery_id: z.string().optional(),
    event_id: z.string(),
    event: z.enum(['change.detected', 'run.completed']),
    status: z.enum(['delivered', 'rejected', 'failed', 'skipped_unsafe_url']),
    http_status: z.number().int().nullable(),
    attempted_at: z.string(),
    error: monitorErrorSchema.nullable()
  })
  .passthrough();
const monitorRunSchema = z
  .object({
    id: z.string(),
    monitor_id: z.string(),
    status: runStatusSchema,
    run_type: z.enum(['baseline', 'scheduled']),
    target_type: targetTypeSchema,
    change_detection_type: detectionTypeSchema,
    started_at: z.string().nullish(),
    completed_at: z.string().nullish(),
    change_detected: z.boolean(),
    change_id: z.string().nullish(),
    baseline_created: z.boolean(),
    credits_charged: z.number().int(),
    skip_reason: z.string().nullish(),
    error: monitorErrorSchema.nullish(),
    webhook_delivery_ids: z.array(z.string()).optional(),
    webhook_delivery: monitorWebhookDeliverySchema.optional(),
    webhook_deliveries: z.array(monitorWebhookDeliverySchema).optional()
  })
  .passthrough();
const monitorRunResponseSchema = monitorRunSchema.extend(responseMetadata);
const listRunsSchema = z
  .object({ data: z.array(monitorRunSchema), ...paginationShape })
  .passthrough();

const listMonitorRuns = contextTool('list-monitor-runs')
  .output(listRunsSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listRunsSchema>
    >('list monitor runs', {
      method: 'GET',
      path: `/monitors/${pathId(ctx.input.monitor_id)}/runs`,
      query: pickDefined({
        status: ctx.input.status,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      })
    });
    return { output, message: `Retrieved ${output.data.length} monitor runs.` };
  })
  .build();

const getMonitorRun = contextTool('get-monitor-run')
  .output(monitorRunResponseSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof monitorRunResponseSchema>
    >('retrieve monitor run', {
      method: 'GET',
      path: `/monitors/${pathId(ctx.input.monitor_id)}/runs/${pathId(ctx.input.run_id)}`
    });
    return {
      output,
      message: `Retrieved monitor run ${output.id} with status ${output.status}.`
    };
  })
  .build();

const listAccountRuns = contextTool('list-account-runs')
  .output(listRunsSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listRunsSchema>
    >('list account monitor runs', {
      method: 'GET',
      path: '/monitors/runs',
      query: ctx.input
    });
    return { output, message: `Retrieved ${output.data.length} account monitor runs.` };
  })
  .build();

const changeSchema = z
  .object({
    mode: z.literal('web'),
    id: z.string(),
    monitor_id: z.string(),
    run_id: z.string(),
    target_type: targetTypeSchema,
    change_detection_type: detectionTypeSchema,
    title: z.string(),
    summary: z.string(),
    detected_at: z.string(),
    url: z.string(),
    tags: z.array(z.string()),
    importance: z.enum(['low', 'medium', 'high']).optional(),
    confidence: z.number().optional(),
    diff: z.string().optional(),
    before_text_excerpt: z.string().optional(),
    after_text_excerpt: z.string().optional(),
    added_urls: z.array(z.string()).optional(),
    removed_urls: z.array(z.string()).optional(),
    added_url_count: z.number().int().optional(),
    removed_url_count: z.number().int().optional(),
    matched_urls: z.array(z.string()).optional(),
    matched_url_count: z.number().int().optional(),
    evidence: z
      .array(
        z
          .object({ url: z.string().optional(), before: z.string(), after: z.string() })
          .passthrough()
      )
      .optional()
  })
  .passthrough();
const changeResponseSchema = changeSchema.extend(responseMetadata);
const listChangesSchema = z
  .object({ data: z.array(changeSchema), ...paginationShape })
  .passthrough();

const listMonitorChanges = contextTool('list-monitor-changes')
  .output(listChangesSchema)
  .handleInvocation(async ctx => {
    validateTimeWindow(ctx.input);
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listChangesSchema>
    >('list monitor changes', {
      method: 'GET',
      path: `/monitors/${pathId(ctx.input.monitor_id)}/changes`,
      query: pickDefined({
        tag: ctx.input.tag,
        since: ctx.input.since,
        until: ctx.input.until,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      })
    });
    return { output, message: `Retrieved ${output.data.length} monitor changes.` };
  })
  .build();

const getChange = contextTool('get-change')
  .output(changeResponseSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof changeResponseSchema>
    >('retrieve monitor change', {
      method: 'GET',
      path: `/monitors/changes/${pathId(ctx.input.change_id)}`
    });
    return { output, message: `Retrieved change ${output.id}: ${output.title}.` };
  })
  .build();

const listChanges = contextTool('list-changes')
  .output(listChangesSchema)
  .handleInvocation(async ctx => {
    validateTimeWindow(ctx.input);
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listChangesSchema>
    >('list account monitor changes', {
      method: 'GET',
      path: '/monitors/changes',
      query: ctx.input
    });
    return { output, message: `Retrieved ${output.data.length} account monitor changes.` };
  })
  .build();

const rotateMonitorWebhookSecret = contextTool('rotate-monitor-webhook-secret')
  .output(monitorResponseSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof monitorResponseSchema>
    >('rotate monitor webhook signing secret', {
      method: 'POST',
      path: `/monitors/${pathId(ctx.input.monitor_id)}/webhook/rotate-secret`
    });
    return {
      output,
      message: `Rotated the webhook signing secret for monitor ${output.id}. Update the webhook receiver to use the returned secret.`
    };
  })
  .build();

export const monitorTools = [
  createMonitor,
  listMonitors,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  getMonitorLimits,
  listMonitorCreditUsage,
  runMonitorNow,
  listMonitorRuns,
  getMonitorRun,
  listAccountRuns,
  listMonitorChanges,
  getChange,
  listChanges,
  rotateMonitorWebhookSecret
];
