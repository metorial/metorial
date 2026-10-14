import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImejisClient, imageMimeTypes } from '../lib/client';
import { signedImageInputSchema } from '../lib/render-schemas';
import { spec } from '../spec';

export let generateSignedImageTool = SlateTool.create(spec, {
  name: 'Generate Signed Image',
  key: 'generate_signed_image',
  description:
    'Render an Imejis.io template as a downloadable image or single-page PDF stored privately with a time-limited signed URL.',
  instructions: [
    'Use a design ID and component names from your Imejis.io template.',
    'Anyone who has the signed URL can access the file until it expires.',
    'The download link expires. Invoke generate_signed_image again explicitly if you need a new link.'
  ],
  constraints: [
    'Each invocation consumes render quota or credits, including when generating a replacement for an expired link.',
    'The URL lifetime is at most 7 days.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(signedImageInputSchema)
  .output(
    z.object({
      designId: z.string().describe('ID of the rendered design template.'),
      imageUrl: z.string().describe('Private signed URL to the generated file.'),
      expiresAt: z
        .string()
        .describe('Conservative ISO expiry time based on the requested URL lifetime.'),
      contentType: z.string().describe('MIME type of the requested file format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImejisClient({ token: ctx.auth.token });
    let result = await client.generateSignedImage(ctx.input);
    let contentType = imageMimeTypes[ctx.input.format ?? 'jpeg'];
    await ctx.addAttachment({
      type: 'url',
      url: result.url,
      mimeType: contentType
    });
    return {
      output: {
        designId: ctx.input.designId,
        imageUrl: result.url,
        expiresAt: result.expiresAt,
        contentType
      },
      message: `Generated a private downloadable file from design \`${ctx.input.designId}\`. Use the signed URL before ${result.expiresAt}; invoke generate_signed_image again if it expires.`
    };
  })
  .build();
