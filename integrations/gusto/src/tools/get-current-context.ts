import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { readContext, tokenInfoSchema } from '../lib/context';
import { exactId, getBaseUrl, requirePrivateResponse } from '../lib/helpers';
import { spec } from '../spec';

export const getCurrentContext = SlateTool.create(spec, {
  name: 'Get Current Context',
  key: 'get_current_context',
  description:
    'Discover the current Gusto token resource, resource owner, granted scopes and company UUID. Each OAuth grant targets one company; use this companyId in other tools. Name and email are omitted when the provider does not expose them.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeCompany: z
        .boolean()
        .optional()
        .describe(
          'Include the company name and partner-managed flag when companies:read was granted. Defaults to true.'
        )
    })
  )
  .output(
    z.object({
      resource: tokenInfoSchema.shape.resource,
      resourceOwner: tokenInfoSchema.shape.resource_owner,
      scopes: z.array(z.string()),
      companyId: z.string().optional(),
      company: z
        .object({
          companyId: z.string(),
          name: z.string().optional(),
          isPartnerManaged: z.boolean().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const info = await readContext(ctx.auth);
    let company: { companyId: string; name?: string; isPartnerManaged?: boolean } | undefined;
    if (
      ctx.input.includeCompany !== false &&
      info.companyId &&
      info.scopes.includes('companies:read')
    ) {
      const r = await new Client({
        token: ctx.auth.token,
        baseUrl: getBaseUrl(ctx.auth.environment)
      }).getCompany(info.companyId);
      if (exactId(r.uuid) !== info.companyId)
        throw createApiServiceError('Gusto returned a different company.', {
          reason: 'company_mismatch'
        });
      if (
        (r.name !== undefined && typeof r.name !== 'string') ||
        (r.is_partner_managed !== undefined && typeof r.is_partner_managed !== 'boolean')
      )
        throw createApiServiceError('Gusto returned invalid company information.', {
          reason: 'invalid_response'
        });
      company = {
        companyId: info.companyId,
        name: typeof r.name === 'string' ? r.name : undefined,
        isPartnerManaged:
          typeof r.is_partner_managed === 'boolean' ? r.is_partner_managed : undefined
      };
    }
    const output = { ...info, company };
    requirePrivateResponse(output, ctx.auth);
    return {
      output,
      message: 'Returned the current Gusto token identity, company and granted scopes.'
    };
  })
  .build();
