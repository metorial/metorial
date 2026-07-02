import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSslCertificates = SlateTool.create(spec, {
  name: 'Get SSL Certificates',
  key: 'get_ssl_certificates',
  description: `Retrieve current and historical SSL/TLS certificate information for a domain. Includes certificate transparency data, certificate details, and issuance history.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z
        .string()
        .describe(
          'Domain or hostname to retrieve SSL certificate data for (e.g., "example.com")'
        )
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried hostname'),
        certificates: z.array(z.any()).optional().describe('SSL certificate records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDomainSsl(ctx.input.hostname);

    let certs = result.certificates ?? result.records ?? [];

    return {
      output: {
        hostname: ctx.input.hostname,
        certificates: certs,
        ...result
      },
      message: `Retrieved SSL certificate data for **${ctx.input.hostname}** (${certs.length} certificate${certs.length !== 1 ? 's' : ''} found).`
    };
  })
  .build();
