import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicenses = SlateTool.create(spec, {
  name: 'List Account Licenses',
  key: 'list_licenses',
  description:
    'List licenses owned by the connected account for a provider product type, including license codes, configuration, expiry, and usage status.',
  instructions: [
    'Use a product type identifier from your provider account. Pagination links are returned as metadata; request the next page with page.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      productType: z.string().describe('Provider product type identifier for the licenses'),
      page: z
        .number()
        .optional()
        .describe('Positive page number; omit to use the provider default'),
      pageSize: z
        .number()
        .optional()
        .describe('Positive number of results per page; omit to use the provider default'),
      expiration: z.string().optional().describe('Filter by exact expiration timestamp'),
      expiresOnOrAfter: z
        .string()
        .optional()
        .describe('Filter expiration on or after an ISO 8601 timestamp'),
      expiresOnOrBefore: z
        .string()
        .optional()
        .describe('Filter expiration on or before an ISO 8601 timestamp'),
      withoutExpiration: z
        .boolean()
        .optional()
        .describe('Filter licenses with a null expiration when true')
    })
  )
  .output(
    z.object({
      licenses: z.array(z.unknown()).describe('Complete provider license records'),
      count: z.number().optional(),
      next: z.string().nullable().optional(),
      previous: z.string().nullable().optional(),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.productType || !/^[a-zA-Z0-9_-]+$/.test(ctx.input.productType)) {
      throw createApiServiceError(
        'Provide a provider product type containing only letters, numbers, underscores, or hyphens.'
      );
    }
    for (let field of ['page', 'pageSize'] as const) {
      let value = ctx.input[field];
      if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
        throw createApiServiceError(`${field} must be a positive integer.`);
      }
    }
    let result = await new Client({ token: ctx.auth.token }).listLicenses(
      ctx.input.productType,
      {
        page: ctx.input.page,
        page_size: ctx.input.pageSize,
        expiration: ctx.input.expiration,
        expiration__gte: ctx.input.expiresOnOrAfter,
        expiration__lte: ctx.input.expiresOnOrBefore,
        expiration__isnull: ctx.input.withoutExpiration
      }
    );
    return {
      output: {
        licenses: result.results,
        count: result.count,
        next: result.next,
        previous: result.previous,
        raw: result
      },
      message: `Retrieved **${result.results.length}** license(s).`
    };
  })
  .build();
