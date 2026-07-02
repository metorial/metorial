import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let getLogo = SlateTool.create(spec, {
  name: 'Get Company Logo',
  key: 'get_logo',
  description: `Get a company's logo URL by its domain. Returns a direct URL to the company's logo image in the specified size and format. The logo is served from Clearbit's CDN.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain (e.g., "clearbit.com")'),
      size: z.number().optional().describe('Image dimensions in pixels (default: 128)'),
      format: z.enum(['png', 'jpg']).optional().describe('Image format (default: "png")'),
      greyscale: z.boolean().optional().describe('Return greyscale image (default: false)')
    })
  )
  .output(
    z.object({
      logoUrl: z.string().describe('Direct URL to the company logo image'),
      domain: z.string().describe('The domain used for lookup')
    })
  )
  .handleInvocation(async ctx => {
    let params: string[] = [];
    if (ctx.input.size !== undefined) params.push(`size=${ctx.input.size}`);
    if (ctx.input.format) params.push(`format=${ctx.input.format}`);
    if (ctx.input.greyscale !== undefined) params.push(`greyscale=${ctx.input.greyscale}`);

    let queryString = params.length > 0 ? `?${params.join('&')}` : '';
    let logoUrl = `https://logo.clearbit.com/${ctx.input.domain}${queryString}`;

    return {
      output: {
        logoUrl,
        domain: ctx.input.domain
      },
      message: `Logo URL for \`${ctx.input.domain}\`: ${logoUrl}`
    };
  })
  .build();
