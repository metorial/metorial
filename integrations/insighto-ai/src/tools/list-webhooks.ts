import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Retrieve all outbound webhooks, or get a specific webhook by ID including its delivery logs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      webhookId: z.string().optional().describe('Specific webhook ID to retrieve'),
      includeLogs: z
        .boolean()
        .optional()
        .describe('Include delivery logs for the specified webhook')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string(),
            name: z.string().optional(),
            endpoint: z.string().optional(),
            enabled: z.boolean().optional()
          })
        )
        .optional(),
      webhook: z
        .object({
          webhookId: z.string(),
          name: z.string().optional(),
          endpoint: z.string().optional(),
          enabled: z.boolean().optional(),
          logs: z.array(z.any()).optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.webhookId) {
      let result = await client.getWebhook(ctx.input.webhookId);
      let data = result.data || result;
      let logs: any[] | undefined;

      if (ctx.input.includeLogs) {
        let logsResult = await client.getWebhookLogs(ctx.input.webhookId);
        logs = logsResult.data || logsResult;
      }

      return {
        output: {
          webhook: {
            webhookId: data.id,
            name: data.name,
            endpoint: data.endpoint,
            enabled: data.enabled,
            logs
          }
        },
        message: `Retrieved webhook **${data.name || data.id}**.`
      };
    }

    let result = await client.listWebhooks();
    let items = result.data || result.items || result;
    let list = Array.isArray(items) ? items : [];
    return {
      output: {
        webhooks: list.map((w: any) => ({
          webhookId: w.id,
          name: w.name,
          endpoint: w.endpoint,
          enabled: w.enabled
        }))
      },
      message: `Found **${list.length}** webhook(s).`
    };
  })
  .build();
