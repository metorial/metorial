import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let monitoringAlert = SlateTrigger.create(spec, {
  name: 'Monitoring Alert',
  key: 'monitoring_alert',
  description:
    'Triggered when StatusCake sends a webhook alert for uptime, page speed, SSL, or heartbeat monitoring events. Configure by setting the webhook URL in a StatusCake Contact Group (Alerting > Contact Groups) and associating the group with your monitors.'
})
  .input(
    z.object({
      testName: z.string().describe('Name of the test that triggered the alert'),
      status: z.string().describe('Current status (Up or Down)'),
      statusCode: z.string().describe('HTTP status code or 0 for timeout'),
      monitorUrl: z.string().describe('URL being monitored'),
      ip: z.string().describe('IP address of the monitored resource'),
      checkRate: z.string().describe('Check rate in seconds'),
      tags: z.string().describe('Comma-separated tags associated with the test'),
      token: z.string().describe('Verification token from StatusCake')
    })
  )
  .output(
    z.object({
      testName: z.string().describe('Name of the test that triggered the alert'),
      status: z.string().describe('Current status (Up or Down)'),
      statusCode: z.string().describe('HTTP status code or 0 for timeout'),
      monitorUrl: z.string().describe('URL being monitored'),
      ip: z.string().describe('IP address of the monitored resource'),
      checkRate: z.string().describe('Check rate in seconds'),
      tags: z.array(z.string()).describe('Tags associated with the test')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let data: Record<string, string> = {};

      if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        for (let [key, value] of params.entries()) {
          data[key] = value;
        }
      } else if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, string>;
      } else {
        let text = await ctx.request.text();
        try {
          data = JSON.parse(text);
        } catch {
          let params = new URLSearchParams(text);
          for (let [key, value] of params.entries()) {
            data[key] = value;
          }
        }
      }

      let testName = data.Name || data.name || '';
      let status = data.Status || data.status || '';
      let statusCode = data.StatusCode || data.status_code || '0';
      let monitorUrl = data.URL || data.url || '';
      let ip = data.IP || data.ip || '';
      let checkRate = data.Checkrate || data.checkrate || data.check_rate || '0';
      let tags = data.Tags || data.tags || '';
      let token = data.Token || data.token || '';

      return {
        inputs: [
          {
            testName,
            status,
            statusCode: String(statusCode),
            monitorUrl,
            ip,
            checkRate: String(checkRate),
            tags,
            token
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let statusLower = ctx.input.status.toLowerCase();
      let eventType =
        statusLower === 'up'
          ? 'monitor.up'
          : statusLower === 'down'
            ? 'monitor.down'
            : `monitor.${statusLower}`;

      let tagList = ctx.input.tags
        ? ctx.input.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];

      let eventId = `${ctx.input.testName}-${ctx.input.status}-${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          testName: ctx.input.testName,
          status: ctx.input.status,
          statusCode: ctx.input.statusCode,
          monitorUrl: ctx.input.monitorUrl,
          ip: ctx.input.ip,
          checkRate: ctx.input.checkRate,
          tags: tagList
        }
      };
    }
  })
  .build();
