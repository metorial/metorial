import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertSpotterClient } from '../lib/client';
import { spec } from '../spec';

let issuerSchema = z
  .object({
    friendlyName: z.string().describe('Human-friendly name of the certificate authority'),
    website: z.string().nullable().optional().describe('Issuer website URL'),
    caaDomains: z
      .array(z.string())
      .nullable()
      .optional()
      .describe('Domain names for CAA record authorization'),
    name: z.string().describe('Distinguished name of the issuer'),
    pubkeySha256: z.string().describe('SHA-256 digest of the issuer public key')
  })
  .optional()
  .describe('Certificate authority information');

let revocationSchema = z
  .object({
    time: z.string().nullable().describe('RFC 3339 formatted revocation time'),
    reason: z.number().nullable().describe('RFC 5280 revocation reason code'),
    checkedAt: z
      .string()
      .nullable()
      .describe('RFC 3339 formatted time of last revocation check')
  })
  .optional()
  .describe('Revocation details');

let pubkeySchema = z
  .object({
    type: z.string().describe('Public key type: rsa, ecdsa, or unknown'),
    bitLength: z.number().optional().describe('Bit length of RSA modulus (RSA keys only)'),
    curve: z.string().optional().describe('Elliptic curve name (ECDSA keys only)')
  })
  .optional()
  .describe('Public key metadata');

let issuanceSchema = z.object({
  issuanceId: z.string().describe('Unique identifier for this certificate issuance'),
  tbsSha256: z.string().describe('SHA-256 digest of the TBSCertificate'),
  certSha256: z.string().describe('SHA-256 fingerprint of the certificate'),
  dnsNames: z.array(z.string()).optional().describe('DNS names the certificate is valid for'),
  pubkeySha256: z.string().describe('SHA-256 digest of the subject public key'),
  notBefore: z.string().describe('Certificate validity start date (RFC 3339)'),
  notAfter: z.string().describe('Certificate expiration date (RFC 3339)'),
  revoked: z.boolean().nullable().describe('Revocation status; null if unknown'),
  issuer: issuerSchema,
  revocation: revocationSchema,
  pubkey: pubkeySchema
});

export let searchCertificates = SlateTool.create(spec, {
  name: 'Search Certificates',
  key: 'search_certificates',
  description: `Search Certificate Transparency logs for SSL/TLS certificates issued for a domain. Returns all known publicly-trusted certificates matching the query, with deduplication across CT logs.
Supports querying subdomains, wildcard matching, pagination for incremental monitoring, and expanding additional certificate fields like issuer and revocation details.`,
  instructions: [
    'Use the **after** parameter with the last issuance ID from a previous query to fetch only new certificates since your last check.',
    'Set **includeSubdomains** to true to get certificates for all subdomains of the specified domain.',
    'Use **expand** to include additional fields like issuer details, revocation status, and public key info.'
  ],
  constraints: [
    'Unauthenticated access is limited to a small number of queries per day.',
    'Results are paginated; if you receive a full page, use the last issuance ID with the after parameter to get more.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Domain name to search for certificates (e.g. "example.com")'),
      includeSubdomains: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include certificates for all subdomains'),
      matchWildcards: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include wildcard certificates that match the domain'),
      after: z
        .string()
        .optional()
        .describe('Issuance ID to paginate from; returns only issuances after this ID'),
      expand: z
        .array(
          z.enum([
            'dns_names',
            'issuer',
            'revocation',
            'pubkey',
            'cert_der',
            'problem_reporting'
          ])
        )
        .optional()
        .describe('Additional fields to include in the response')
    })
  )
  .output(
    z.object({
      issuances: z
        .array(issuanceSchema)
        .describe('List of certificate issuances matching the query'),
      totalReturned: z.number().describe('Number of issuances returned in this response'),
      lastIssuanceId: z
        .string()
        .nullable()
        .describe('ID of the last issuance; use with "after" for pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertSpotterClient({ token: ctx.auth.token });

    let issuances = await client.searchIssuances({
      domain: ctx.input.domain,
      includeSubdomains: ctx.input.includeSubdomains,
      matchWildcards: ctx.input.matchWildcards,
      after: ctx.input.after,
      expand: ctx.input.expand
    });

    let mapped = issuances.map(i => ({
      issuanceId: i.id,
      tbsSha256: i.tbs_sha256,
      certSha256: i.cert_sha256,
      dnsNames: i.dns_names,
      pubkeySha256: i.pubkey_sha256,
      notBefore: i.not_before,
      notAfter: i.not_after,
      revoked: i.revoked,
      issuer: i.issuer
        ? {
            friendlyName: i.issuer.friendly_name,
            website: i.issuer.website,
            caaDomains: i.issuer.caa_domains,
            name: i.issuer.name,
            pubkeySha256: i.issuer.pubkey_sha256
          }
        : undefined,
      revocation: i.revocation
        ? {
            time: i.revocation.time,
            reason: i.revocation.reason,
            checkedAt: i.revocation.checked_at
          }
        : undefined,
      pubkey: i.pubkey
        ? {
            type: i.pubkey.type,
            bitLength: i.pubkey.bit_length,
            curve: i.pubkey.curve
          }
        : undefined
    }));

    let lastId = issuances.length > 0 ? issuances[issuances.length - 1]!.id : null;

    return {
      output: {
        issuances: mapped,
        totalReturned: mapped.length,
        lastIssuanceId: lastId
      },
      message: `Found **${mapped.length}** certificate issuance(s) for **${ctx.input.domain}**${ctx.input.includeSubdomains ? ' (including subdomains)' : ''}.${lastId ? ` Last issuance ID: \`${lastId}\`` : ''}`
    };
  })
  .build();
