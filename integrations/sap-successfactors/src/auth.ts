import { createPrivateKey, createPublicKey, randomUUID, X509Certificate } from 'node:crypto';
import {
  createAxios,
  getOAuthExpiresAtFromExpiresIn,
  isApiErrorRecord,
  SlateAuth
} from 'slates';
import { SignedXml } from 'xml-crypto';
import { z } from 'zod';
import { apiOrigin, invalid, nonempty, upstream } from './lib/helpers';

const server = z
  .string()
  .describe(
    'HTTPS API server origin from SAP’s published API-server list; not the company login or certificate-server URL.'
  );
const company = z
  .string()
  .describe('The company ID used to sign in. Obtain it from the company administrator.');
const samlInput = z.object({
  apiServerUrl: server,
  companyId: company,
  apiKey: z.string().describe('Registered OAuth application API key (client_id).'),
  userId: z
    .string()
    .describe('API user ID whose role-based permissions and target population apply.'),
  privateKey: z
    .string()
    .describe('PEM RSA private key matching the certificate registered for the OAuth client.'),
  x509Certificate: z
    .string()
    .describe('PEM X.509 certificate registered for the OAuth client; use SHA-2.'),
  issuer: z
    .string()
    .optional()
    .describe('Nonempty SAML issuer identifier; defaults to the client API key.')
});
const escapeXml = (s: string) =>
  nonempty(s, 'SAML value')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
export function buildSamlAssertion(input: z.infer<typeof samlInput>, origin: string): string {
  try {
    let key = createPrivateKey(input.privateKey);
    let cert = new X509Certificate(input.x509Certificate);
    if (
      key.asymmetricKeyType !== 'rsa' ||
      cert.publicKey.asymmetricKeyType !== 'rsa' ||
      !cert.checkPrivateKey(key) ||
      (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 ||
      Date.parse(cert.validFrom) > Date.now() ||
      Date.parse(cert.validTo) <= Date.now()
    )
      throw invalid(
        'Provide a currently valid RSA certificate and matching RSA private key of at least 2048 bits, registered for the OAuth client.'
      );
    let publicPem = createPublicKey(key).export({ format: 'pem', type: 'spki' });
    if (!publicPem) throw invalid('The signing key is invalid.');
    let now = new Date();
    let expiry = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    let id = `_${randomUUID()}`;
    let issue = now.toISOString();
    let xml =
      `<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ID="${id}" IssueInstant="${issue}" Version="2.0">` +
      `<saml2:Issuer>${escapeXml(input.issuer ?? input.apiKey)}</saml2:Issuer>` +
      `<saml2:Subject><saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">${escapeXml(input.userId)}</saml2:NameID>` +
      `<saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml2:SubjectConfirmationData NotOnOrAfter="${expiry}" Recipient="${escapeXml(`${origin}/oauth/token`)}"/></saml2:SubjectConfirmation></saml2:Subject>` +
      `<saml2:Conditions NotBefore="${new Date(now.getTime() - 30_000).toISOString()}" NotOnOrAfter="${expiry}"><saml2:AudienceRestriction><saml2:Audience>www.successfactors.com</saml2:Audience></saml2:AudienceRestriction></saml2:Conditions>` +
      `<saml2:AttributeStatement><saml2:Attribute Name="api_key"><saml2:AttributeValue xsi:type="xs:string">${escapeXml(input.apiKey)}</saml2:AttributeValue></saml2:Attribute></saml2:AttributeStatement></saml2:Assertion>`;
    let signature = new SignedXml({
      privateKey: input.privateKey,
      publicCert: input.x509Certificate,
      canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
    });
    signature.addReference({
      xpath: "/*[local-name()='Assertion']",
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#'
      ],
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256'
    });
    signature.computeSignature(xml, {
      prefix: 'ds',
      location: {
        reference: "/*[local-name()='Assertion']/*[local-name()='Issuer']",
        action: 'after'
      }
    });
    return Buffer.from(signature.getSignedXml()).toString('base64');
  } catch (error) {
    throw upstream(error, 'SAML signing');
  }
}
async function exchange(input: z.infer<typeof samlInput>) {
  let origin = apiOrigin(input.apiServerUrl);
  nonempty(input.companyId, 'Company ID');
  nonempty(input.apiKey, 'API key');
  nonempty(input.userId, 'User ID');
  let assertion = buildSamlAssertion(input, origin);
  let client = createAxios({ baseURL: origin, timeout: 30_000, maxRedirects: 0 });
  try {
    let body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:saml2-bearer',
      company_id: input.companyId,
      client_id: input.apiKey,
      assertion
    });
    let response: { data: unknown };
    try {
      response = await client.post('/oauth/token', body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch (error) {
      throw upstream(error, 'OAuth token exchange', false);
    }
    let data: unknown = response.data;
    if (
      !isApiErrorRecord(data) ||
      typeof data.access_token !== 'string' ||
      !data.access_token.trim() ||
      data.token_type !== 'Bearer'
    )
      throw invalid(
        'SAP returned an invalid OAuth token response. Reconnect and check the registered SAML application.'
      );
    if (
      (typeof data.expires_in !== 'number' &&
        (typeof data.expires_in !== 'string' || !/^\d+$/.test(data.expires_in))) ||
      !Number.isSafeInteger(Number(data.expires_in)) ||
      Number(data.expires_in) <= 0 ||
      Number(data.expires_in) > 86400
    )
      throw invalid(
        'SAP returned an invalid SAML token lifetime. Expected a positive lifetime of at most 24 hours.'
      );
    let expiresAt = getOAuthExpiresAtFromExpiresIn(data.expires_in);
    if (!expiresAt)
      throw invalid(
        'SAP did not return a valid token expiry. Reconnect and check the OAuth response.'
      );
    return {
      token: nonempty(data.access_token, 'Access token'),
      apiServerUrl: origin,
      companyId: input.companyId,
      expiresAt
    };
  } catch (error) {
    throw upstream(error, 'OAuth token exchange');
  }
}
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiServerUrl: z.string(),
      companyId: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    key: 'oauth_saml_bearer',
    name: 'OAuth 2.0 SAML Bearer Assertion',
    inputSchema: samlInput,
    getOutput: async ctx => ({ output: await exchange(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      input: z.infer<typeof samlInput>;
      output: { token: string; apiServerUrl: string; companyId: string; expiresAt?: string };
    }) => {
      if (
        apiOrigin(ctx.output.apiServerUrl) !== apiOrigin(ctx.input.apiServerUrl) ||
        ctx.output.companyId !== ctx.input.companyId
      )
        throw invalid(
          'The saved company or API server changed. Reconnect before renewing this token.'
        );
      return { output: await exchange(ctx.input) };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    key: 'bearer_token',
    name: 'Bearer Token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Pre-obtained OAuth or OIDC bearer token. Replace it by reconnecting when it expires.'
        ),
      apiServerUrl: server,
      companyId: company
    }),
    getOutput: async ctx => ({
      output: {
        token: nonempty(ctx.input.token, 'Access token'),
        apiServerUrl: apiOrigin(ctx.input.apiServerUrl),
        companyId: nonempty(ctx.input.companyId, 'Company ID')
      }
    })
  });
