import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { Client } from './client';
import { getBaseUrl, requirePrivateResponse } from './helpers';

const identityResource = z.object({ type: z.string().min(1), uuid: z.string().min(1) });
export const tokenInfoSchema = z.object({
  scope: z.string(),
  resource: identityResource.nullable().optional(),
  resource_owner: identityResource.nullable().optional()
});
export const readContext = async (auth: {
  token: string;
  refreshToken?: string;
  environment?: string;
  companyId?: string;
}) => {
  const client = new Client({ token: auth.token, baseUrl: getBaseUrl(auth.environment) });
  const parsed = tokenInfoSchema.safeParse(await client.getTokenInfo());
  if (!parsed.success)
    throw createApiServiceError(
      'Gusto returned invalid token resource information. Reconnect the account.',
      { reason: 'invalid_token_info' }
    );
  const info = parsed.data;
  requirePrivateResponse(info, auth);
  const companyId = info.resource?.type === 'Company' ? info.resource.uuid : undefined;
  if (auth.companyId !== undefined && companyId !== auth.companyId)
    throw createApiServiceError(
      'The Gusto token now targets a different company. Reconnect before using it.',
      { reason: 'company_mismatch' }
    );
  return {
    resource: info.resource,
    resourceOwner: info.resource_owner,
    scopes: info.scope.split(/\s+/).filter(Boolean),
    companyId
  };
};
