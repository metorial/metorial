import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiServerUrl: z.string(),
      companyId: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 2.0 SAML Bearer Assertion',
    key: 'oauth_saml_bearer',

    inputSchema: z.object({
      apiServerUrl: z
        .string()
        .describe(
          'The base URL of your SAP SuccessFactors API instance (e.g., https://apisalesdemo4.successfactors.com)'
        ),
      companyId: z.string().describe('Your SAP SuccessFactors company ID'),
      apiKey: z
        .string()
        .describe(
          'The API key (client_id) generated during OAuth client application registration'
        ),
      userId: z.string().describe('The SAP SuccessFactors user ID to authenticate as'),
      privateKey: z
        .string()
        .describe('PEM-encoded private key used to sign the SAML assertion'),
      x509Certificate: z
        .string()
        .describe('PEM-encoded X.509 certificate corresponding to the private key')
    }),

    getOutput: async ctx => {
      let { apiServerUrl, companyId, apiKey, userId, privateKey, x509Certificate } = ctx.input;

      let baseUrl = apiServerUrl.replace(/\/+$/, '');

      let samlAssertion = buildSamlAssertion({
        userId,
        apiServerUrl: baseUrl,
        companyId,
        privateKey,
        x509Certificate
      });

      let client = createAxios({
        baseURL: baseUrl
      });

      let params = new URLSearchParams();
      params.append('grant_type', 'urn:ietf:params:oauth:grant-type:saml2-bearer');
      params.append('company_id', companyId);
      params.append('client_id', apiKey);
      params.append('assertion', samlAssertion);

      let response = await client.post('/oauth/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        output: {
          token: response.data.access_token,
          apiServerUrl: baseUrl,
          companyId
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',

    inputSchema: z.object({
      token: z.string().describe('A pre-obtained OAuth Bearer access token'),
      apiServerUrl: z
        .string()
        .describe(
          'The base URL of your SAP SuccessFactors API instance (e.g., https://apisalesdemo4.successfactors.com)'
        ),
      companyId: z.string().describe('Your SAP SuccessFactors company ID')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          apiServerUrl: ctx.input.apiServerUrl.replace(/\/+$/, ''),
          companyId: ctx.input.companyId
        }
      };
    }
  });

let buildSamlAssertion = (params: {
  userId: string;
  apiServerUrl: string;
  companyId: string;
  privateKey: string;
  x509Certificate: string;
}): string => {
  let now = new Date();
  let notOnOrAfter = new Date(now.getTime() + 5 * 60 * 1000);
  let issueInstant = now.toISOString();
  let notOnOrAfterStr = notOnOrAfter.toISOString();

  let assertionId = `_${generateRandomId()}`;
  let tokenUrl = `${params.apiServerUrl}/oauth/token`;

  let certBody = params.x509Certificate
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');

  let assertion =
    `<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" IssueInstant="${issueInstant}" Version="2.0">` +
    `<saml2:Issuer>www.successfactors.com</saml2:Issuer>` +
    `<saml2:Subject>` +
    `<saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">${params.userId}</saml2:NameID>` +
    `<saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">` +
    `<saml2:SubjectConfirmationData NotOnOrAfter="${notOnOrAfterStr}" Recipient="${tokenUrl}"/>` +
    `</saml2:SubjectConfirmation>` +
    `</saml2:Subject>` +
    `<saml2:Conditions NotBefore="${issueInstant}" NotOnOrAfter="${notOnOrAfterStr}">` +
    `<saml2:AudienceRestriction>` +
    `<saml2:Audience>www.successfactors.com</saml2:Audience>` +
    `</saml2:AudienceRestriction>` +
    `</saml2:Conditions>` +
    `<saml2:AuthnStatement AuthnInstant="${issueInstant}">` +
    `<saml2:AuthnContext>` +
    `<saml2:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml2:AuthnContextClassRef>` +
    `</saml2:AuthnContext>` +
    `</saml2:AuthnStatement>` +
    `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<ds:SignedInfo>` +
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<ds:Reference URI="#${assertionId}">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `<ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<ds:DigestValue></ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>` +
    `<ds:SignatureValue></ds:SignatureValue>` +
    `<ds:KeyInfo>` +
    `<ds:X509Data>` +
    `<ds:X509Certificate>${certBody}</ds:X509Certificate>` +
    `</ds:X509Data>` +
    `</ds:KeyInfo>` +
    `</ds:Signature>` +
    `</saml2:Assertion>`;

  return Buffer.from(assertion).toString('base64');
};

let generateRandomId = (): string => {
  let chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
