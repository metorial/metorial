import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getListResult, getObjectResult } from '../lib/client';
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
        .describe('Include delivery logs for the specified webhook'),
      page: z.number().optional().describe('Page number, starting at 1'),
      size: z.number().optional().describe('Items per page, from 1 to 100')
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
      let data = getObjectResult(result);
      let logs: any[] | undefined;

      if (ctx.input.includeLogs) {
        let logsResult = await client.getWebhookLogs(ctx.input.webhookId, {
          page: ctx.input.page,
          size: ctx.input.size
        });
        logs = getListResult(logsResult).items;
      }

      return {
        output: {
          webhook: {
            webhookId: data.id,
            name: data.name ?? undefined,
            endpoint: data.endpoint ?? undefined,
            enabled: data.enabled ?? undefined,
            logs
          }
        },
        message: `Retrieved webhook **${data.name || data.id}**.`
      };
    }

    let result = await client.listWebhooks({ page: ctx.input.page, size: ctx.input.size });
    let { items: list } = getListResult(result);
    return {
      output: {
        webhooks: list.map((w: any) => ({
          webhookId: w.id,
          name: w.name ?? undefined,
          endpoint: w.endpoint ?? undefined,
          enabled: w.enabled ?? undefined
        }))
      },
      message: `Found **${list.length}** webhook(s).`
    };
  })
  .build();
