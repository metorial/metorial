import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CLIENT_STATE = 'slates-conversation-changes';

export let conversationChanges = SlateTrigger.create(spec, {
  name: 'Conversation Changes',
  key: 'conversation_changes',
  description:
    'Fires when messages in the mailbox are created, updated, or deleted. Subscribes to Microsoft Graph `me/messages` webhooks and surfaces **conversationId**-centric payloads for triage workflows.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Graph change type for the message resource'),
      resourceUri: z.string().describe('Resource path from the notification'),
      messageId: z.string().describe('Affected message id'),
      subscriptionId: z.string().describe('Subscription that produced the notification'),
      tenantId: z.string().optional()
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional(),
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
      parentFolderId: z.string().optional(),
      webLink: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let expirationDateTime = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000
      ).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated,deleted',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: 'me/messages',
        expirationDateTime,
        clientState: CLIENT_STATE
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

      let notifications = body.value.filter(n => n.clientState === CLIENT_STATE);

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
          type: `conversation.message_${changeType}`,
          id: `${messageId}-${changeType}-${Date.now()}`,
          output: {
            messageId
          }
        };
      }

      try {
        let client = new Client({ token: ctx.auth.token });
        let msg = await client.getMessage(messageId, [
          'id',
          'conversationId',
          'subject',
          'bodyPreview',
          'from',
          'toRecipients',
          'receivedDateTime',
          'isRead',
          'importance',
          'hasAttachments',
          'parentFolderId',
          'webLink'
        ]);

        return {
          type: `conversation.message_${changeType}`,
          id: `${messageId}-${changeType}-${msg.receivedDateTime || Date.now()}`,
          output: {
            conversationId: msg.conversationId,
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
            parentFolderId: msg.parentFolderId,
            webLink: msg.webLink
          }
        };
      } catch {
        return {
          type: `conversation.message_${changeType}`,
          id: `${messageId}-${changeType}-${Date.now()}`,
          output: {
            messageId
          }
        };
      }
    }
  })
  .build();
