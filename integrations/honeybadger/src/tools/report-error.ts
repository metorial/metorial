import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerReportingClient } from '../lib/reporting-client';
import { spec } from '../spec';

export let reportError = SlateTool.create(spec, {
  name: 'Report Error',
  key: 'report_error',
  description: `Report an exception/error to Honeybadger via the Reporting API. Accepts an error notice for asynchronous processing in the project associated with your configured key. Project rules may send alerts or integration messages. Requires a project API key.`,
  instructions: [
    'Include a real backtrace when available. An accepted notice ID does not guarantee later processing; use search_errors and get_error_details to verify.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      errorClass: z.string().describe('Error class name (e.g., "RuntimeError", "TypeError")'),
      message: z.string().describe('Error message'),
      tags: z.array(z.string()).optional().describe('Tags to associate with the error'),
      fingerprint: z.string().optional().describe('Custom fingerprint for grouping errors'),
      environment: z.string().optional().describe('Environment name (e.g., "production")'),
      component: z.string().optional().describe('Component where the error occurred'),
      action: z.string().optional().describe('Action where the error occurred'),
      backtrace: z
        .array(
          z.object({
            number: z.string().describe('Line number'),
            file: z.string().describe('Source file'),
            method: z.string().optional(),
            source: z.record(z.string(), z.string()).optional()
          })
        )
        .optional()
        .describe('Stack frames for error grouping and debugging'),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional context data (e.g., user_id, user_email)')
    })
  )
  .output(
    z.object({
      noticeId: z.string().describe('ID of the created notice'),
      success: z.boolean().describe('Whether the error was reported')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.projectToken) {
      throw createApiServiceError(
        'A project API key is required to report errors. Configure it in your authentication settings.'
      );
    }
    let reportingClient = new HoneybadgerReportingClient({
      projectToken: ctx.auth.projectToken,
      region: ctx.auth.region
    });
    let result = await reportingClient.reportError({
      errorClass: ctx.input.errorClass,
      message: ctx.input.message,
      tags: ctx.input.tags,
      fingerprint: ctx.input.fingerprint,
      environment: ctx.input.environment,
      component: ctx.input.component,
      action: ctx.input.action,
      context: ctx.input.context,
      backtrace: ctx.input.backtrace
    });

    return {
      output: {
        noticeId: result.id,
        success: true
      },
      message: `Accepted error notice for **${ctx.input.errorClass}**: "${ctx.input.message}".`
    };
  })
  .build();
