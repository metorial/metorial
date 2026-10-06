import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { generationDownload, imageFile, imageFileOutputSchema } from '../lib/files';
import { spec } from '../spec';

export let getGenerationResult = SlateTool.create(spec, {
  name: 'Get Image Generation Result',
  key: 'get_generation_result',
  description:
    'Check an asynchronous creative upscale or background replacement job and retrieve its downloadable image when complete.',
  instructions: [
    'Use the same connection that submitted the job. Results expire after 24 hours. Poll no more than once every 10 seconds.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      generationId: z.string().length(64).describe('Job ID returned by transform_image')
    })
  )
  .output(imageFileOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).getGenerationResult(ctx.input.generationId);
    if (result.status === 'in-progress')
      return {
        output: { status: 'in-progress' as const, generationId: ctx.input.generationId },
        message: 'The image is still processing. Check again after 10 seconds.'
      };
    let file = imageFile(result, 'generated-image', ctx.input.generationId);
    await ctx.addAttachment(
      generationDownload(ctx.input.generationId, ctx.auth.token, file.output.mimeType)
    );
    return {
      output: file.output,
      message:
        'The generated image is ready to download. It remains available for 24 hours after generation.'
    };
  })
  .build();
