import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let sslCertificateLookup = SlateTool.create(spec, {
  name: 'SSL Certificate Lookup',
  key: 'ssl_certificate_lookup',
  description: `Retrieve the SSL/TLS certificate details for a domain, including validity dates, issuer, subject, and public key information. Optionally retrieve the full certificate chain from end-user to root CA, or include raw OpenSSL output.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .describe('Domain name to retrieve the SSL certificate for (e.g. "example.com")'),
      includeChain: z
        .boolean()
        .optional()
        .describe('Whether to retrieve the full SSL certificate chain'),
      includeRaw: z
        .boolean()
        .optional()
        .describe('Whether to include the raw OpenSSL response')
    })
  )
  .output(
    z.object({
      sslCertificate: z.any().describe('SSL certificate details for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.sslLookup(ctx.input.domainName, {
      chain: ctx.input.includeChain,
      sslRaw: ctx.input.includeRaw
    });

    return {
      output: { sslCertificate: result },
      message: `Retrieved SSL certificate for **${ctx.input.domainName}**${ctx.input.includeChain ? ' (including full chain)' : ''}.`
    };
  })
  .build();
