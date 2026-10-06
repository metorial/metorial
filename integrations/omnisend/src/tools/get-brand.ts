import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let getBrand = SlateTool.create(spec, {
  name: 'Get Current Brand',
  key: 'get_brand',
  description:
    'Read the brand accessible through this connection to verify store identity. Requires API version 2026-03-15 and brand-read permission; v5 does not document this GET operation.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      brandId: z.string().describe('Provider brand ID'),
      name: z.string().optional().describe('Brand name'),
      website: z.string().optional().describe('Brand website'),
      currency: z.string().optional().describe('Brand currency code')
    })
  )
  .handleInvocation(async ctx => ({
    output: await new OmnisendClient(ctx.auth, ctx.config.apiVersion).getBrand(),
    message: 'Retrieved the current brand identity.'
  }))
  .build();
