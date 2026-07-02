import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let signatureEvents = SlateTrigger.create(spec, {
  name: 'Signature Events',
  key: 'signature_events',
  description:
    'Triggered when individual signatures succeed or fail within a signature request.'
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
      signerId: z.string().optional().describe('Signer ID who signed'),
      action: z.string().describe('Event action (SIGNATURE_SUCCESS or SIGNATURE_FAILED)'),
      msgNature: z.string().optional().describe('Message nature'),
      signatureMethod: z.string().optional().describe('Method used for signing'),
      externalId: z.string().optional().describe('External reference ID'),
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
        description: 'Slates - Signature Events'
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

      if (data.topic !== 'SIGNATURE') {
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
        type: `signature.${(ctx.input.action || 'unknown').toLowerCase()}`,
        id: `${content.signatureRequestId || 'unknown'}-${content.signerId || 'unknown'}-${ctx.input.action}-${ctx.input.verificationToken || Date.now()}`,
        output: {
          signatureRequestId: content.signatureRequestId || '',
          signerId: content.signerId,
          action: ctx.input.action,
          msgNature: ctx.input.msgNature,
          signatureMethod: content.signatureMethod,
          externalId: content.signatureRequestExternalId || content.externalId,
          appId: ctx.input.appId,
          appEnv: ctx.input.appEnv,
          content
        }
      };
    }
  })
  .build();
