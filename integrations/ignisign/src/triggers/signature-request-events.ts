import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let signatureRequestEvents = SlateTrigger.create(spec, {
  name: 'Signature Request Events',
  key: 'signature_request_events',
  description:
    'Triggered when signature request state changes occur, such as initialization, update, publish, launch, close, completion, cancellation, or expiration.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      action: z.string().describe('Webhook action'),
      msgNature: z.string().optional().describe('Message nature: SUCCESS, WARNING, or ERROR'),
      appId: z.string().optional().describe('Application ID'),
      appEnv: z.string().optional().describe('Application environment'),
      verificationToken: z.string().optional().describe('Token for verification'),
      content: z.any().describe('Event payload content')
    })
  )
  .output(
    z.object({
      signatureRequestId: z.string().describe('Signature request ID'),
      action: z
        .string()
        .describe('Event action (e.g., INIT, UPDATE, PUBLISH, LAUNCHED, CLOSED, COMPLETED)'),
      msgNature: z.string().optional().describe('Message nature'),
      externalId: z.string().optional().describe('External reference ID if set'),
      signerId: z.string().optional().describe('Related signer ID if applicable'),
      appId: z.string().optional().describe('Application ID'),
      appEnv: z.string().optional().describe('Application environment'),
      content: z.any().optional().describe('Full event content')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new IgnisignClient({
        token: ctx.auth.token,
        appId: ctx.config.appId,
        appEnv: ctx.config.appEnv
      });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        description: 'Slates - Signature Request Events'
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId || result._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new IgnisignClient({
        token: ctx.auth.token,
        appId: ctx.config.appId,
        appEnv: ctx.config.appEnv
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.topic !== 'SIGNATURE_REQUEST') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            topic: data.topic,
            action: data.action,
            msgNature: data.msgNature,
            appId: data.appId,
            appEnv: data.appEnv,
            verificationToken: data.verificationToken,
            content: data.content
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let content = ctx.input.content || {};

      return {
        type: `signature_request.${(ctx.input.action || 'unknown').toLowerCase()}`,
        id: `${content.signatureRequestId || 'unknown'}-${ctx.input.action}-${ctx.input.verificationToken || Date.now()}`,
        output: {
          signatureRequestId: content.signatureRequestId || '',
          action: ctx.input.action,
          msgNature: ctx.input.msgNature,
          externalId: content.signatureRequestExternalId || content.externalId,
          signerId: content.signerId,
          appId: ctx.input.appId,
          appEnv: ctx.input.appEnv,
          content
        }
      };
    }
  })
  .build();
