import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createZohoAxios } from '../lib/client';
import { getDeskBaseUrl, ZOHO_API_ORIGINS } from '../lib/urls';
import { spec } from '../spec';

export let organizationDiscoveryTools = (
  ['books', 'inventory', 'invoice', 'desk'] as const
).map(product =>
  SlateTool.create(spec, {
    key: `${product}_list_organizations`,
    name: `${product === 'desk' ? 'Desk' : product.charAt(0).toUpperCase() + product.slice(1)} List Organizations`,
    description: `Discover authorized Zoho ${product} organizations and their IDs before calling organization-scoped tools.`,
    tags: { readOnly: true }
  })
    .input(z.object({}))
    .output(z.object({ organizations: z.array(z.record(z.string(), z.any())) }))
    .handleInvocation(async ctx => {
      if (ctx.auth.apiDomain !== ZOHO_API_ORIGINS[ctx.auth.region]) {
        throw createApiServiceError('Invalid Zoho API domain. Reconnect the account.');
      }
      let baseURL =
        product === 'desk'
          ? `${getDeskBaseUrl(ctx.auth.region)}/api/v1`
          : `${ctx.auth.apiDomain}/${product}/${product === 'inventory' ? 'v1' : 'v3'}`;
      let http = createZohoAxios(
        { baseURL, headers: { Authorization: `Zoho-oauthtoken ${ctx.auth.token}` } },
        `${product} organization discovery`
      );
      let response = await http.get('/organizations');
      let data = response.data;
      if (typeof data?.code === 'number' && data.code !== 0) {
        throw createApiServiceError(data.message ?? 'Organization discovery failed.');
      }
      let organizations = product === 'desk' ? data?.data : data?.organizations;
      if (!Array.isArray(organizations)) {
        throw createApiServiceError(`Zoho ${product} returned an invalid organization list.`);
      }
      return {
        output: { organizations },
        message: `Retrieved ${organizations.length} organization(s).`
      };
    })
    .build()
);

export let whoAmI = SlateTool.create(spec, {
  key: 'who_am_i',
  name: 'Who Am I',
  description: 'Read the authenticated Zoho user profile.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ profile: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let http = createZohoAxios(
      {
        baseURL: ctx.auth.accountsUrl,
        headers: { Authorization: `Zoho-oauthtoken ${ctx.auth.token}` }
      },
      'user profile'
    );
    let response = await http.get('/oauth/user/info');
    return {
      output: { profile: response.data },
      message: 'Retrieved the authenticated Zoho user profile.'
    };
  })
  .build();
