import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let messageChanges = SlateTrigger.create(spec, {
  name: 'Email Changes',
  key: 'message_changes',
  description:
    "Triggers when email messages are created, updated, or deleted in the user's mailbox. Subscribes to Microsoft Graph webhook notifications for message changes."
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change that occurred'),
      resourceUri: z.string().describe('Resource path of the changed message'),
      messageId: z.string().describe('ID of the affected message'),
      subscriptionId: z
        .string()
        .describe('ID of the subscription that generated the notification'),
      tenantId: z.string().optional()
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      subject: z.string().optional(),
      bodyPreview: z.string().optional(),
      fromAddress: z.string().optional(),
      fromName: z.string().optional(),
      toRecipients: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      receivedDateTime: z.string().optional(),
      isRead: z.boolean().optional(),
      importance: z.string().optional(),
      hasAttachments: z.boolean().optional(),
      conversationId: z.string().optional(),
      parentFolderId: z.string().optional(),
      webLink: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // Subscriptions expire after max 3 days (4230 minutes) for messages
      let expirationDateTime = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000
      ).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated,deleted',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: 'me/messages',
        expirationDateTime,
        clientState: 'slates-message-changes'
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          expirationDateTime: subscription.expirationDateTime
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let url = new URL(ctx.request.url);
      let validationToken = url.searchParams.get('validationToken');
      if (validationToken) {
        // Microsoft Graph subscription validation: echo back the token
        return {
          inputs: [],
          response: new Response(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          })
        };
      }

      let body = (await ctx.request.json()) as {
        value: Array<{
          changeType: 'created' | 'updated' | 'deleted';
          resource: string;
          resourceData?: { id: string; '@odata.type'?: string };
          subscriptionId: string;
          clientState?: string;
          tenantId?: string;
        }>;
      };

      if (!body?.value?.length) {
        return { inputs: [] };
      }

      // Validate client state
      let notifications = body.value.filter(n => n.clientState === 'slates-message-changes');

      let inputs = notifications
        .filter(n => n.resourceData?.id)
        .map(n => ({
          changeType: n.changeType,
          resourceUri: n.resource,
          messageId: n.resourceData!.id,
          subscriptionId: n.subscriptionId,
          tenantId: n.tenantId
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let { changeType, messageId } = ctx.input;

      if (changeType === 'deleted') {
        return {
          type: `message.${changeType}`,
          id: `${messageId}-${changeType}-${Date.now()}`,
          output: {
            messageId
          }
        };
      }

      // Fetch full message details for created/updated events
      try {
        let client = new Client({ token: ctx.auth.token });
        let msg = await client.getMessage(messageId);

        return {
          type: `message.${changeType}`,
          id: `${messageId}-${changeType}-${msg.receivedDateTime || Date.now()}`,
          output: {
            messageId: msg.id,
            subject: msg.subject,
            bodyPreview: msg.bodyPreview,
            fromAddress: msg.from?.emailAddress?.address,
            fromName: msg.from?.emailAddress?.name,
            toRecipients: msg.toRecipients?.map(r => ({
              address: r.emailAddress.address,
              name: r.emailAddress.name
            })),
            receivedDateTime: msg.receivedDateTime,
            isRead: msg.isRead,
            importance: msg.importance,
            hasAttachments: msg.hasAttachments,
            conversationId: msg.conversationId,
            parentFolderId: msg.parentFolderId,
            webLink: msg.webLink
          }
        };
      } catch {
        return {
          type: `message.${changeType}`,
          id: `${messageId}-${changeType}-${Date.now()}`,
          output: {
            messageId
          }
        };
      }
    }
  })
  .build();
