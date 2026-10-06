import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

let stacktraceFrameSchema = z.object({
  file: z.string().optional().describe('Source file path'),
  lineNumber: z.number().optional().describe('Line number'),
  columnNumber: z.number().optional().describe('Column number'),
  method: z.string().optional().describe('Method/function name'),
  inProject: z.boolean().optional().describe('Whether this frame is in your project code')
});

let exceptionSchema = z.object({
  errorClass: z.string().optional().describe('Exception class name'),
  message: z.string().optional().describe('Exception message'),
  stacktrace: z.array(stacktraceFrameSchema).optional().describe('Stack trace frames')
});

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Get full details of a specific error event including stacktrace, user info, device info, app info, breadcrumbs, metadata, and feature flags. This provides the complete diagnostic information for a single occurrence.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID the event belongs to'),
      eventId: z.string().describe('Event ID to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique identifier of the event'),
      errorId: z.string().optional().describe('ID of the parent error'),
      receivedAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the event was received'),
      exceptions: z
        .array(exceptionSchema)
        .optional()
        .describe('Exception details with stacktraces'),
      severity: z.string().optional().describe('Event severity'),
      unhandled: z.boolean().optional().describe('Whether unhandled'),
      context: z.string().optional().describe('Context where the error occurred'),
      user: z
        .object({
          userId: z.string().optional().describe('User ID'),
          email: z.string().optional().describe('User email'),
          name: z.string().optional().describe('User name')
        })
        .optional()
        .describe('User who experienced the error'),
      app: z
        .object({
          version: z.string().optional().describe('App version'),
          releaseStage: z.string().optional().describe('Release stage'),
          type: z.string().optional().describe('App type')
        })
        .optional()
        .describe('Application information'),
      device: z
        .object({
          hostname: z.string().optional().describe('Device hostname'),
          osName: z.string().optional().describe('Operating system name'),
          osVersion: z.string().optional().describe('OS version'),
          browserName: z.string().optional().describe('Browser name'),
          browserVersion: z.string().optional().describe('Browser version'),
          manufacturer: z.string().optional().describe('Device manufacturer'),
          model: z.string().optional().describe('Device model')
        })
        .optional()
        .describe('Device information'),
      request: z
        .object({
          clientIp: z.string().optional().describe('Client IP address'),
          httpMethod: z.string().optional().describe('HTTP method'),
          url: z.string().optional().describe('Request URL'),
          referer: z.string().optional().describe('Referer URL')
        })
        .optional()
        .describe('HTTP request details'),
      breadcrumbs: z
        .array(
          z.object({
            timestamp: z.string().optional().describe('Breadcrumb timestamp'),
            name: z.string().optional().describe('Breadcrumb name/message'),
            type: z.string().optional().describe('Breadcrumb type'),
            metaData: z.any().optional().describe('Breadcrumb metadata')
          })
        )
        .optional()
        .describe('Breadcrumb trail leading to the error'),
      featureFlags: z
        .array(
          z.object({
            featureFlag: z.string().describe('Feature flag name'),
            variant: z.string().optional().describe('Feature flag variant')
          })
        )
        .optional()
        .describe('Active feature flags'),
      metaData: z.any().optional().describe('Custom metadata attached to the event'),
      groupingHash: z.string().optional().describe('Custom grouping hash')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    let event = await client.getEvent(projectId, ctx.input.eventId);

    let output = {
      eventId: event.id ?? undefined,
      errorId: event.error_id ?? undefined,
      receivedAt: event.received_at ?? undefined,
      exceptions: event.exceptions?.map(ex => ({
        errorClass: ex.errorClass ?? undefined,
        message: ex.message ?? undefined,
        stacktrace: ex.stacktrace?.map(frame => ({
          file: frame.file ?? undefined,
          lineNumber: frame.lineNumber ?? undefined,
          columnNumber: frame.columnNumber ?? undefined,
          method: frame.method ?? undefined,
          inProject: frame.inProject ?? undefined
        }))
      })),
      severity: event.severity ?? undefined,
      unhandled: event.unhandled ?? undefined,
      context: event.context ?? undefined,
      user: event.user
        ? {
            userId: event.user.id ?? undefined,
            email: event.user.email ?? undefined,
            name: event.user.name ?? undefined
          }
        : undefined,
      app: event.app
        ? {
            version: event.app.version ?? undefined,
            releaseStage: event.app.releaseStage ?? undefined,
            type: event.app.type ?? undefined
          }
        : undefined,
      device: event.device
        ? {
            hostname: event.device.hostname ?? undefined,
            osName: event.device.osName ?? undefined,
            osVersion: event.device.osVersion ?? undefined,
            browserName: event.device.browserName ?? undefined,
            browserVersion: event.device.browserVersion ?? undefined,
            manufacturer: event.device.manufacturer ?? undefined,
            model: event.device.model ?? undefined
          }
        : undefined,
      request: event.request
        ? {
            clientIp: event.request.clientIp ?? undefined,
            httpMethod: event.request.httpMethod ?? undefined,
            url: event.request.url ?? undefined,
            referer: event.request.referer ?? undefined
          }
        : undefined,
      breadcrumbs: event.breadcrumbs ?? undefined,
      featureFlags: event.feature_flags?.map(flag => ({
        featureFlag: flag.feature_flag_name,
        variant: flag.variant_name ?? undefined
      })),
      metaData: event.metaData ?? undefined,
      groupingHash: undefined
    };

    let exClass = event.exceptions?.[0]?.errorClass || 'Unknown';
    let exMsg = event.exceptions?.[0]?.message || '';

    return {
      output,
      message: `Event **${exClass}**: "${exMsg}" — received at ${event.received_at || 'unknown'}, severity: ${event.severity || 'unknown'}.`
    };
  })
  .build();
