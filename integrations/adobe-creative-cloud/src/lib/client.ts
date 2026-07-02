import { createAxios } from 'slates';

export interface AdobeAuthConfig {
  token: string;
  clientId: string;
  orgId?: string;
}

export let createAdobeAxios = (baseURL: string, auth: AdobeAuthConfig) => {
  return createAxios({
    baseURL,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'x-api-key': auth.clientId,
      ...(auth.orgId ? { 'x-gw-ims-org-id': auth.orgId } : {})
    }
  });
};
