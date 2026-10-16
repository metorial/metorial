import { SlateTool } from 'slates';
import { z } from 'zod';
import { bannerOutputSchema, mapBanner } from '../lib/banner';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let getGenerationStatus = SlateTool.create(spec, {
  name: 'Get Generation Status',
  key: 'get_generation_status',
  description: `Poll the status of an asynchronous generation request. Returns whether the generation is finalized, along with any generated banners and errors. Use this after calling "Generate Multi-Format" to retrieve results.`,
  constraints: ['Generation requests expire after 7 days.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      generationRequestId: z
        .string()
        .describe('UUID of the generation request returned by "Generate Multi-Format"')
    })
  )
  .output(
    z.object({
      isFinalized: z.boolean().describe('Whether the generation request has completed'),
      generationRequestId: z.string().describe('ID of the generation request'),
      banners: z.array(bannerOutputSchema).describe('Successfully generated files'),
      errors: z
        .array(
          z.object({
            templateFormatName: z.string().optional().describe('Format name that failed'),
            reason: z.string().optional().describe('Error description')
          })
        )
        .optional()
        .describe('Errors for formats that failed generation'),
      raw: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.getGenerationRequestStatus(ctx.input.generationRequestId);

    let banners = result.banners.map(mapBanner);
    for (let banner of result.banners) {
      await ctx.addAttachment({
        type: 'url',
        url: banner.file.url,
        filename: banner.file.filename
      });
    }
    let errors = result.errors?.map(error => ({
      templateFormatName: error.template_format_name,
      reason: error.reason
    }));

    let status = result.is_finalized ? 'Completed' : 'In progress';
    let errorMsg = (errors?.length ?? 0) > 0 ? ` with **${errors?.length}** error(s)` : '';

    return {
      output: {
        isFinalized: result.is_finalized,
        generationRequestId: result.id,
        banners,
        errors,
        raw: result
      },
      message: `Generation request \`${result.id}\`: **${status}**. ${banners.length} banner(s) generated${errorMsg}.`
    };
  })
  .build();
