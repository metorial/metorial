import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newImageImpression = SlateTrigger.create(spec, {
  name: 'New Image Impression',
  key: 'new_image_impression',
  description:
    'Triggers when a personalized image is viewed by a recipient. Polls for new impression events using the image template hash configured in the provider settings.',
  instructions: [
    'Set the imageTemplateHash in the Hyperise provider configuration to specify which image template to monitor.'
  ]
})
  .input(
    z.object({
      impressionId: z.string().describe('Unique ID of the impression event'),
      imageName: z.string().optional().describe('Name of the viewed image template'),
      processedAt: z
        .string()
        .optional()
        .describe('Timestamp when the impression was processed'),
      rawImpression: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full impression record from the API')
    })
  )
  .output(
    z
      .object({
        impressionId: z.string().describe('Unique ID of the impression event'),
        imageName: z.string().optional().describe('Name of the viewed image template'),
        imageHash: z
          .string()
          .optional()
          .describe('Hash of the image template that was viewed'),
        processedAt: z
          .string()
          .optional()
          .describe('Timestamp when the impression was processed'),
        firstName: z
          .string()
          .optional()
          .describe('First name of the recipient who viewed the image'),
        lastName: z
          .string()
          .optional()
          .describe('Last name of the recipient who viewed the image'),
        email: z.string().optional().describe('Email of the recipient who viewed the image'),
        businessName: z.string().optional().describe('Business name of the recipient')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let imageHash = ctx.config.imageTemplateHash;
      if (!imageHash) {
        return { inputs: [], updatedState: (ctx.state as any) || {} };
      }

      let client = new Client({ token: ctx.auth.token });

      let lastDate = (ctx.state as any)?.lastDate as string | undefined;
      if (!lastDate) {
        let oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        lastDate = `${oneDayAgo.toISOString().slice(0, 19)}Z`;
      }

      let result = await client.listImageImpressions(imageHash, lastDate);

      let impressions: any[] = Array.isArray(result) ? result : (result?.data ?? []);

      let newLastDate = lastDate;
      if (impressions.length > 0) {
        let sorted = [...impressions].sort((a: any, b: any) => {
          let dateA = a.processed_at || a.created_at || '';
          let dateB = b.processed_at || b.created_at || '';
          return dateB.localeCompare(dateA);
        });
        newLastDate = sorted[0].processed_at || sorted[0].created_at || lastDate;
      }

      return {
        inputs: impressions.map((imp: any) => ({
          impressionId: String(imp.id ?? imp.impression_id ?? ''),
          imageName: imp.image_name || imp.name,
          processedAt: imp.processed_at || imp.created_at,
          rawImpression: imp
        })),
        updatedState: {
          lastDate: newLastDate
        }
      };
    },

    handleEvent: async ctx => {
      let raw: Record<string, any> = ctx.input.rawImpression || {};

      return {
        type: 'image.viewed',
        id: ctx.input.impressionId,
        output: {
          impressionId: ctx.input.impressionId,
          imageName: ctx.input.imageName,
          imageHash: raw.image_hash as string | undefined,
          processedAt: ctx.input.processedAt,
          firstName: raw.first_name as string | undefined,
          lastName: raw.last_name as string | undefined,
          email: raw.email as string | undefined,
          businessName: raw.business_name as string | undefined,
          ...raw
        }
      };
    }
  })
  .build();
