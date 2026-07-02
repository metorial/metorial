import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let signerEvents = SlateTrigger.create(spec, {
  name: 'Signer Events',
  key: 'signer_events',
  description:
    'Triggered when signer-related events occur, such as signer creation or when new inputs/claims are added.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      action: z.string().describe('Webhook action'),
      msgNature: z.string().optional().describe('Message nature'),
      appId: z.string().optional().describe('Application ID'),
      appEnv: z.string().optional().describe('Application environment'),
      verificationToken: z.string().optional().describe('Token for verification'),
      content: z.any().describe('Event payload content')
    })
  )
  .output(
    z.object({
      signerId: z.string().describe('Signer ID'),
      action: z.string().describe('Event action (CREATED or CLAIM_UPDATED)'),
      msgNature: z.string().optional().describe('Message nature'),
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
        description: 'Slates - Signer Events'
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

      if (data.topic !== 'SIGNER') {
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
        type: `signer.${(ctx.input.action || 'unknown').toLowerCase()}`,
        id: `${content.signerId || 'unknown'}-${ctx.input.action}-${ctx.input.verificationToken || Date.now()}`,
        output: {
          signerId: content.signerId || '',
          action: ctx.input.action,
          msgNature: ctx.input.msgNature,
          appId: ctx.input.appId,
          appEnv: ctx.input.appEnv,
          content
        }
      };
    }
  })
  .build();
