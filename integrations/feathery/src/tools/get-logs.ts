import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let getLogs = SlateTool.create(spec, {
  name: 'Get Logs',
  key: 'get_logs',
  description: `Retrieve recent logs for API connector errors, form emails sent, or email delivery issues (bounces/complaints). API connector and email logs require a form ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      logType: z
        .enum(['api_connector', 'form_email', 'email_issues'])
        .describe('Type of logs to retrieve'),
      formId: z
        .string()
        .optional()
        .describe('Form ID (required for api_connector and form_email log types)'),
      startTime: z.string().optional().describe('Filter logs after this datetime (ISO 8601)'),
      endTime: z.string().optional().describe('Filter logs before this datetime (ISO 8601)'),
      eventType: z
        .enum(['Bounce', 'Complaint'])
        .optional()
        .describe('Event type filter (only for email_issues)')
    })
  )
  .output(
    z.object({
      logs: z.array(z.any()).describe('Log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let logs: any;

    if (ctx.input.logType === 'api_connector') {
      if (!ctx.input.formId) throw new Error('formId is required for api_connector logs');
      logs = await client.getApiConnectorLogs(ctx.input.formId, {
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime
      });
    } else if (ctx.input.logType === 'form_email') {
      if (!ctx.input.formId) throw new Error('formId is required for form_email logs');
      logs = await client.getFormEmailLogs(ctx.input.formId, {
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime
      });
    } else {
      logs = await client.getEmailIssueLogs({
        eventType: ctx.input.eventType
      });
    }

    let logArray = Array.isArray(logs) ? logs : logs.results || logs.data || [];

    return {
      output: { logs: logArray },
      message: `Retrieved **${logArray.length}** ${ctx.input.logType} log(s).`
    };
  })
  .build();
