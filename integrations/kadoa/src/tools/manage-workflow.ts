import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { validateKadoaInteger } from '../lib/validation';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `Perform lifecycle actions on a Kadoa workflow: pause, resume, schedule, delete, or update metadata.
Use this to change a workflow's name, URLs, schedule, tags, monitoring configuration, schema, or navigation settings.`,
  instructions: [
    'To schedule a workflow, provide a future ISO 8601 UTC date string in the scheduleDate field.',
    'To update monitoring, set the monitoring field with field-level change tracking configuration.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to manage'),
      action: z
        .enum(['pause', 'resume', 'schedule', 'delete', 'update_metadata'])
        .describe('Action to perform'),
      scheduleDate: z
        .string()
        .optional()
        .describe('ISO 8601 UTC date for scheduling (required for "schedule" action)'),
      name: z.string().optional().describe('New workflow name (for update_metadata)'),
      description: z
        .string()
        .optional()
        .describe('New workflow description (for update_metadata)'),
      urls: z
        .array(z.string())
        .optional()
        .describe('Updated target URLs (for update_metadata)'),
      tags: z.array(z.string()).optional().describe('Updated tags (for update_metadata)'),
      updateInterval: z
        .enum(['ONLY_ONCE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'])
        .optional()
        .describe('Schedule frequency (for update_metadata)'),
      schedules: z
        .array(z.string())
        .optional()
        .describe(
          'Cron expressions for update_metadata; provide these when using CUSTOM frequency'
        ),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone for cron schedules (for update_metadata)'),
      limit: z
        .number()
        .nullable()
        .optional()
        .describe('Maximum records per run, or null for unlimited (for update_metadata)'),
      monitoring: z
        .object({
          fields: z
            .array(
              z.object({
                fieldName: z.string(),
                operator: z.enum(['changed', 'added', 'removed'])
              })
            )
            .optional()
        })
        .optional()
        .describe('Monitoring configuration (for update_metadata)'),
      maxPages: z.number().optional().describe('Max pages to crawl (for update_metadata)'),
      maxDepth: z.number().optional().describe('Max navigation depth (for update_metadata)'),
      navigationMode: z
        .enum([
          'single-page',
          'paginated-page',
          'page-and-detail',
          'agentic-navigation',
          'all-pages'
        ])
        .optional()
        .describe('Navigation mode (for update_metadata)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action succeeded'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });
    let { workflowId, action } = ctx.input;

    if (action === 'pause') {
      await client.pauseWorkflow(workflowId);
      return {
        output: { success: true, message: 'Workflow paused' },
        message: `Workflow **${workflowId}** has been **paused**.`
      };
    }

    if (action === 'resume') {
      let result = await client.resumeWorkflow(workflowId);
      return {
        output: { success: true, message: result.message || 'Workflow resumed' },
        message: `Workflow **${workflowId}** has been **resumed**.`
      };
    }

    if (action === 'schedule') {
      if (!ctx.input.scheduleDate) {
        throw createApiServiceError('scheduleDate is required for the schedule action.');
      }
      if (
        !Number.isFinite(Date.parse(ctx.input.scheduleDate)) ||
        !ctx.input.scheduleDate.endsWith('Z')
      ) {
        throw createApiServiceError(
          'scheduleDate must be a valid ISO 8601 UTC timestamp ending in Z.'
        );
      }
      await client.scheduleWorkflow(workflowId, ctx.input.scheduleDate);
      return {
        output: { success: true, message: 'Workflow scheduled' },
        message: `Workflow **${workflowId}** scheduled for **${ctx.input.scheduleDate}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteWorkflow(workflowId);
      return {
        output: { success: true, message: 'Workflow deleted' },
        message: `Workflow **${workflowId}** has been **deleted**.`
      };
    }

    if (action === 'update_metadata') {
      validateKadoaInteger(ctx.input.maxPages, 'maxPages', 1);
      validateKadoaInteger(ctx.input.maxDepth, 'maxDepth', 1);
      validateKadoaInteger(ctx.input.limit, 'limit', 1, 2147483647);
      let body = pickDefined({
        name: ctx.input.name,
        description: ctx.input.description,
        urls: ctx.input.urls,
        tags: ctx.input.tags,
        updateInterval: ctx.input.updateInterval,
        schedules: ctx.input.schedules,
        timezone: ctx.input.timezone,
        limit: ctx.input.limit,
        monitoring: ctx.input.monitoring,
        maxPages: ctx.input.maxPages,
        maxDepth: ctx.input.maxDepth,
        navigationMode: ctx.input.navigationMode
      });
      if (Object.keys(body).length === 0) {
        throw createApiServiceError('Provide at least one metadata field to update.');
      }

      let result = await client.updateWorkflowMetadata(workflowId, body);
      return {
        output: {
          success: result.success !== false,
          message: result.message || 'Metadata updated'
        },
        message: `Workflow **${workflowId}** metadata has been **updated**.`
      };
    }

    throw createApiServiceError(`Unknown workflow action: ${action}.`);
  })
  .build();
