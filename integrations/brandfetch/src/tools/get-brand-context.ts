import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BrandApiClient } from '../lib/client';
import { spec } from '../spec';

export let getBrandContext = SlateTool.create(spec, {
  name: 'Get Brand Context',
  key: 'get_brand_context',
  description:
    'Retrieve structured brand context for a domain, website URL, or email address: identity, positioning, products and services, brand voice, visual style, and competitors.',
  instructions: [
    'The provider resolves website URLs and email addresses to their registrable domain.',
    'Use cachedOnly for an immediate lookup. found is false when no cached context exists; omit cachedOnly to allow live resolution.',
    'Context generation may still be in progress. If the API reports this, retry after the delay stated in its error.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Brand domain, website URL, or email address on the domain'),
      cachedOnly: z
        .boolean()
        .optional()
        .describe('Return only cached context without starting a live crawl')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether the provider returned brand context'),
      domain: z.string().optional().describe('Resolved domain from the provider'),
      canonicalName: z.string().optional().describe('Canonical brand name from the provider'),
      resolvedAt: z
        .string()
        .optional()
        .describe('When the context was resolved, as returned by the provider'),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider context with original snake_case fields and all sections')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.domain.trim()) {
      throw createApiServiceError('Provide a brand domain, website URL, or email address.');
    }
    let context = await new BrandApiClient(ctx.auth.token).getBrandContext(
      ctx.input.domain,
      ctx.input.cachedOnly
    );
    return {
      output: {
        found: context !== undefined,
        domain: context?.meta?.domain,
        canonicalName: context?.meta?.canonical_name,
        resolvedAt: context?.meta?.resolved_at,
        context
      },
      message: context
        ? `Retrieved brand context for **${context.meta?.canonical_name ?? ctx.input.domain}**.`
        : `No cached brand context exists for **${ctx.input.domain}**. Retry without cachedOnly to allow live resolution.`
    };
  })
  .build();
