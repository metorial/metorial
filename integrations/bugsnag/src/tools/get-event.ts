import { SlateTool } from 'slates';
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
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    let event = await client.getEvent(projectId, ctx.input.eventId);

    let output = {
      eventId: event.id,
      errorId: event.error_id,
      receivedAt: event.received_at,
      exceptions: event.exceptions?.map((ex: any) => ({
        errorClass: ex.errorClass || ex.error_class,
        message: ex.message,
        stacktrace: ex.stacktrace?.map((frame: any) => ({
          file: frame.file,
          lineNumber: frame.lineNumber ?? frame.line_number,
          columnNumber: frame.columnNumber ?? frame.column_number,
          method: frame.method,
          inProject: frame.inProject ?? frame.in_project
        }))
      })),
      severity: event.severity,
      unhandled: event.unhandled,
      context: event.context,
      user: event.user
        ? {
            userId: event.user.id,
            email: event.user.email,
            name: event.user.name
          }
        : undefined,
      app: event.app
        ? {
            version: event.app.version,
            releaseStage: event.app.releaseStage ?? event.app.release_stage,
            type: event.app.type
          }
        : undefined,
      device: event.device
        ? {
            hostname: event.device.hostname,
            osName: event.device.osName ?? event.device.os_name,
            osVersion: event.device.osVersion ?? event.device.os_version,
            browserName: event.device.browserName ?? event.device.browser_name,
            browserVersion: event.device.browserVersion ?? event.device.browser_version,
            manufacturer: event.device.manufacturer,
            model: event.device.model
          }
        : undefined,
      request: event.request
        ? {
            clientIp: event.request.clientIp ?? event.request.client_ip,
            httpMethod: event.request.httpMethod ?? event.request.http_method,
            url: event.request.url,
            referer: event.request.referer
          }
        : undefined,
      breadcrumbs: event.breadcrumbs,
      featureFlags: event.feature_flags ?? event.featureFlags,
      metaData: event.metaData ?? event.meta_data,
      groupingHash: event.groupingHash ?? event.grouping_hash
    };

    let exClass =
      event.exceptions?.[0]?.errorClass || event.exceptions?.[0]?.error_class || 'Unknown';
    let exMsg = event.exceptions?.[0]?.message || '';

    return {
      output,
      message: `Event **${exClass}**: "${exMsg}" — received at ${event.received_at || 'unknown'}, severity: ${event.severity || 'unknown'}.`
    };
  })
  .build();
