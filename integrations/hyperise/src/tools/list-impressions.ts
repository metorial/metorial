import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listImpressions = SlateTool.create(spec, {
  name: 'List Image Impressions',
  key: 'list_image_impressions',
  description: `List the most recent personalized image impressions (views) for a specific image template. Track when recipients view personalized images in your campaigns. Optionally filter by date to only see recent impressions.`,
  instructions: [
    'The imageTemplateHash can be obtained from the List Image Templates tool.',
    'Use dateFrom to filter impressions since a specific date (ISO 8601 format, e.g. "2024-01-15T00:00:00Z").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      imageTemplateHash: z
        .string()
        .describe('Hash identifier of the image template to check impressions for'),
      dateFrom: z
        .string()
        .optional()
        .describe(
          'Only return impressions after this date (ISO 8601 format, e.g. "2024-01-15T00:00:00Z")'
        )
    })
  )
  .output(
    z.object({
      impressions: z
        .array(
          z
            .object({
              impressionId: z.string().describe('Unique ID of the impression event'),
              imageName: z.string().optional().describe('Name of the viewed image template'),
              processedAt: z
                .string()
                .optional()
                .describe('Timestamp when the impression was processed')
            })
            .passthrough()
        )
        .describe('List of image impression events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listImageImpressions(
      ctx.input.imageTemplateHash,
      ctx.input.dateFrom
    );

    let impressions = Array.isArray(result) ? result : (result?.data ?? []);

    let mapped = impressions.map((imp: any) => ({
      impressionId: (imp.id ?? imp.impression_id)?.toString(),
      imageName: imp.image_name || imp.name,
      processedAt: imp.processed_at || imp.created_at,
      ...imp
    }));

    return {
      output: { impressions: mapped },
      message: `Found **${mapped.length}** impression(s) for template \`${ctx.input.imageTemplateHash}\`.`
    };
  })
  .build();
