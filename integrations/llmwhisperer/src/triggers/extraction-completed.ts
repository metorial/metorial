import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractionCompleted = SlateTrigger.create(spec, {
  name: 'Extraction Completed',
  key: 'extraction_completed',
  description:
    'Triggered when a document extraction job completes. Receives the extracted text, confidence metadata, and line metadata via webhook callback from LLMWhisperer.'
})
  .input(
    z.object({
      whisperHash: z.string().describe('Unique identifier for the extraction job.'),
      status: z.string().describe('Extraction result status (e.g., "success", "error").'),
      statusMessage: z.string().describe('Human-readable status message.'),
      resultText: z.string().describe('The extracted text content.'),
      lineMetadata: z.any().describe('Line-level position metadata for highlights.'),
      confidenceMetadata: z.any().describe('Confidence scores for extracted text.'),
      documentMetadata: z.any().describe('Additional document metadata.')
    })
  )
  .output(
    z.object({
      whisperHash: z.string().describe('Unique identifier for the extraction job.'),
      status: z.string().describe('Extraction result status.'),
      statusMessage: z.string().describe('Human-readable status message.'),
      resultText: z.string().describe('The extracted text content from the document.'),
      lineMetadata: z.any().describe('Line-level position metadata for highlights.'),
      confidenceMetadata: z.any().describe('Confidence scores for extracted text.'),
      documentMetadata: z.any().describe('Additional document metadata.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let webhookName = `slates_${Date.now()}`;

      await client.registerWebhook({
        url: ctx.input.webhookBaseUrl,
        authToken: '',
        webhookName
      });

      return {
        registrationDetails: {
          webhookName
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let webhookName = ctx.input.registrationDetails?.webhookName;
      if (webhookName) {
        await client.deleteWebhook(webhookName);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let payloadStatus = data.payload_status || {};

      return {
        inputs: [
          {
            whisperHash: payloadStatus.whisper_hash || '',
            status: payloadStatus.status || '',
            statusMessage: payloadStatus.message || '',
            resultText: data.result_text || '',
            lineMetadata: data.line_metadata || null,
            confidenceMetadata: data.confidence_metadata || null,
            documentMetadata: data.metadata || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `extraction.${ctx.input.status === 'success' ? 'completed' : 'failed'}`,
        id: ctx.input.whisperHash,
        output: {
          whisperHash: ctx.input.whisperHash,
          status: ctx.input.status,
          statusMessage: ctx.input.statusMessage,
          resultText: ctx.input.resultText,
          lineMetadata: ctx.input.lineMetadata,
          confidenceMetadata: ctx.input.confidenceMetadata,
          documentMetadata: ctx.input.documentMetadata
        }
      };
    }
  })
  .build();
