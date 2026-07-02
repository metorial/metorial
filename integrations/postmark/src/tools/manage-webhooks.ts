import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { postmarkServiceError, requirePostmarkNumber } from '../lib/errors';
import { spec } from '../spec';

let triggerSchema = z
  .object({
    open: z
      .object({
        enabled: z.boolean().describe('Enable open tracking webhook.'),
        postFirstOpenOnly: z.boolean().optional().describe('Only post on first open.')
      })
      .optional(),
    click: z
      .object({
        enabled: z.boolean().describe('Enable click tracking webhook.')
      })
      .optional(),
    delivery: z
      .object({
        enabled: z.boolean().describe('Enable delivery webhook.')
      })
      .optional(),
    bounce: z
      .object({
        enabled: z.boolean().describe('Enable bounce webhook.'),
        includeContent: z
          .boolean()
          .optional()
          .describe('Include full message content in bounce.')
      })
      .optional(),
    spamComplaint: z
      .object({
        enabled: z.boolean().describe('Enable spam complaint webhook.'),
        includeContent: z.boolean().optional().describe('Include full message content.')
      })
      .optional(),
    subscriptionChange: z
      .object({
        enabled: z.boolean().describe('Enable subscription change webhook.')
      })
      .optional()
  })
  .describe('Webhook trigger configuration.');

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, get, create, update, or delete webhooks on your Postmark server. Webhooks notify your application about message events like bounces, deliveries, opens, clicks, spam complaints, and subscription changes.`,
  instructions: [
    'Set **action** to "list", "get", "create", "update", or "delete".',
    'For "create", provide the **url** and **triggers** configuration.',
    'Up to 10 webhooks can be configured per server.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Webhook operation.'),
      webhookId: z.number().optional().describe('Webhook ID (for get/update/delete).'),
      url: z.string().optional().describe('Webhook endpoint URL (for create/update).'),
      messageStream: z.string().optional().describe('Message stream to filter or attach to.'),
      httpAuth: z
        .object({
          username: z.string().describe('HTTP basic auth username.'),
          password: z.string().describe('HTTP basic auth password.')
        })
        .optional()
        .describe('HTTP basic authentication for the webhook.'),
      httpHeaders: z
        .array(
          z.object({
            name: z.string().describe('Header name.'),
            value: z.string().describe('Header value.')
          })
        )
        .optional()
        .describe('Custom HTTP headers for the webhook.'),
      triggers: triggerSchema.optional()
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.number().describe('Webhook ID.'),
            url: z.string().describe('Webhook URL.'),
            messageStream: z.string().describe('Associated message stream.'),
            triggers: z
              .object({
                openEnabled: z.boolean().describe('Open tracking enabled.'),
                clickEnabled: z.boolean().describe('Click tracking enabled.'),
                deliveryEnabled: z.boolean().describe('Delivery notification enabled.'),
                bounceEnabled: z.boolean().describe('Bounce notification enabled.'),
                spamComplaintEnabled: z.boolean().describe('Spam complaint enabled.'),
                subscriptionChangeEnabled: z.boolean().describe('Subscription change enabled.')
              })
              .describe('Configured triggers.')
          })
        )
        .optional()
        .describe('Webhook list (for list action).'),
      webhook: z
        .object({
          webhookId: z.number().describe('Webhook ID.'),
          url: z.string().describe('Webhook URL.'),
          messageStream: z.string().describe('Associated message stream.'),
          triggers: z
            .object({
              openEnabled: z.boolean().describe('Open tracking enabled.'),
              clickEnabled: z.boolean().describe('Click tracking enabled.'),
              deliveryEnabled: z.boolean().describe('Delivery notification enabled.'),
              bounceEnabled: z.boolean().describe('Bounce notification enabled.'),
              spamComplaintEnabled: z.boolean().describe('Spam complaint enabled.'),
              subscriptionChangeEnabled: z.boolean().describe('Subscription change enabled.')
            })
            .describe('Configured triggers.')
        })
        .optional()
        .describe('Webhook details (for get/create/update).'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    let mapWebhook = (w: any) => ({
      webhookId: w.ID,
      url: w.Url,
      messageStream: w.MessageStream,
      triggers: {
        openEnabled: w.Triggers?.Open?.Enabled ?? false,
        clickEnabled: w.Triggers?.Click?.Enabled ?? false,
        deliveryEnabled: w.Triggers?.Delivery?.Enabled ?? false,
        bounceEnabled: w.Triggers?.Bounce?.Enabled ?? false,
        spamComplaintEnabled: w.Triggers?.SpamComplaint?.Enabled ?? false,
        subscriptionChangeEnabled: w.Triggers?.SubscriptionChange?.Enabled ?? false
      }
    });

    if (ctx.input.action === 'list') {
      let result = await client.listWebhooks(ctx.input.messageStream);

      return {
        output: {
          webhooks: result.Webhooks.map(mapWebhook)
        },
        message: `Found **${result.Webhooks.length}** webhooks.`
      };
    }

    if (ctx.input.action === 'get') {
      let webhookId = requirePostmarkNumber(ctx.input.webhookId, 'webhookId', 'get');

      let w = await client.getWebhook(webhookId);

      return {
        output: {
          webhook: mapWebhook(w)
        },
        message: `Retrieved webhook **${w.ID}** → ${w.Url}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.url || !ctx.input.triggers) {
        throw postmarkServiceError('url and triggers are required for "create".');
      }

      let w = await client.createWebhook({
        url: ctx.input.url,
        messageStream: ctx.input.messageStream,
        httpAuth: ctx.input.httpAuth,
        httpHeaders: ctx.input.httpHeaders,
        triggers: ctx.input.triggers
      });

      return {
        output: {
          webhook: mapWebhook(w)
        },
        message: `Created webhook **${w.ID}** → ${w.Url}`
      };
    }

    if (ctx.input.action === 'update') {
      let webhookId = requirePostmarkNumber(ctx.input.webhookId, 'webhookId', 'update');

      let w = await client.editWebhook(webhookId, {
        url: ctx.input.url,
        httpAuth: ctx.input.httpAuth,
        httpHeaders: ctx.input.httpHeaders,
        triggers: ctx.input.triggers
      });

      return {
        output: {
          webhook: mapWebhook(w)
        },
        message: `Updated webhook **${w.ID}** → ${w.Url}`
      };
    }

    // delete
    let webhookId = requirePostmarkNumber(ctx.input.webhookId, 'webhookId', 'delete');

    await client.deleteWebhook(webhookId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted webhook **${webhookId}**.`
    };
  });
