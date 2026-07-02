import crypto from 'crypto';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let generateSignedUrl = SlateTool.create(spec, {
  name: 'Generate Signed URL',
  key: 'generate_signed_url',
  description: `Generate a signed/secure Imgix URL for an image. Signed URLs prevent unauthorized modifications to URL parameters and can include an expiration timestamp. Requires the source's secure URL token (available from the source configuration). Useful for protecting premium content or time-limited access.`,
  instructions: [
    'You can retrieve the secure URL token from the source details (Get Source tool).',
    'The image path should not include the domain, just the path (e.g., "/images/photo.jpg").',
    'Any rendering parameters (width, height, format, etc.) should be included in the params field.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Imgix source domain (e.g., "example.imgix.net" or custom domain)'),
      path: z.string().describe('Image path within the source (e.g., "/images/photo.jpg")'),
      secureUrlToken: z.string().describe('Source-specific secure URL token for signing'),
      params: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Rendering parameters to include in the URL (e.g., {"w": "400", "h": "300", "fit": "crop"})'
        ),
      expiresAt: z.number().optional().describe('Unix timestamp for URL expiration')
    })
  )
  .output(
    z.object({
      signedUrl: z.string().describe('The fully signed Imgix URL'),
      expiresAt: z.number().optional().describe('Unix timestamp when the URL expires, if set')
    })
  )
  .handleInvocation(async ctx => {
    let path = ctx.input.path.startsWith('/') ? ctx.input.path : `/${ctx.input.path}`;

    let queryParts: string[] = [];

    if (ctx.input.params) {
      for (let [key, value] of Object.entries(ctx.input.params)) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }

    if (ctx.input.expiresAt !== undefined) {
      queryParts.push(`expires=${ctx.input.expiresAt}`);
    }

    let queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    let signatureBase = ctx.input.secureUrlToken + path + queryString;
    let signature = crypto.createHash('md5').update(signatureBase).digest('base64url');

    let separator = queryString ? '&' : '?';
    let signedUrl = `https://${ctx.input.domain}${path}${queryString}${separator}s=${signature}`;

    return {
      output: {
        signedUrl,
        expiresAt: ctx.input.expiresAt
      },
      message: `Generated signed URL for **${path}**${ctx.input.expiresAt ? ` (expires at ${ctx.input.expiresAt})` : ''}.`
    };
  })
  .build();
