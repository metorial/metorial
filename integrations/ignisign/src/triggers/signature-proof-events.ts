import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let signatureProofEvents = SlateTrigger.create(spec, {
  name: 'Signature Proof Events',
  key: 'signature_proof_events',
  description:
    'Triggered when signature proof documents are generated or when generation fails, including standard and advanced proofs.'
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
      signatureRequestId: z.string().describe('Signature request ID'),
      action: z.string().describe('Event action (GENERATED or FAILED)'),
      msgNature: z.string().optional().describe('Message nature'),
      documents: z
        .array(
          z.object({
            documentId: z.string().optional().describe('Document ID'),
            name: z.string().optional().describe('Document name'),
            documentProofUrl: z.string().optional().describe('Proof URL for this document')
          })
        )
        .optional()
        .describe('Documents with proof info'),
      signatureProofUrl: z.string().optional().describe('Overall signature proof URL'),
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
        description: 'Slates - Signature Proof Events'
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

      if (data.topic !== 'SIGNATURE_PROOF') {
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

      let documents = (content.documents || []).map((doc: any) => ({
        documentId: doc.documentId,
        name: doc.name,
        documentProofUrl: doc.documentProofUrl
      }));

      return {
        type: `signature_proof.${(ctx.input.action || 'unknown').toLowerCase()}`,
        id: `${content.signatureRequestId || 'unknown'}-proof-${ctx.input.action}-${ctx.input.verificationToken || Date.now()}`,
        output: {
          signatureRequestId: content.signatureRequestId || '',
          action: ctx.input.action,
          msgNature: ctx.input.msgNature,
          documents,
          signatureProofUrl: content.signatureProofUrl,
          externalId: content.signatureRequestExternalId || content.externalId,
          appId: ctx.input.appId,
          appEnv: ctx.input.appEnv,
          content
        }
      };
    }
  })
  .build();
