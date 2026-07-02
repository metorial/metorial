import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkSsl = SlateTool.create(spec, {
  name: 'Check SSL Certificate',
  key: 'check_ssl',
  description: `Inspect the SSL/TLS certificate of a domain. Returns certificate details including issuer, validity dates, key strength, and subject alternative names. Useful for security auditing and monitoring certificate expiration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('The domain to check the SSL certificate for (e.g. "example.com")')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('The checked domain'),
      issuerOrganization: z.string().describe('Certificate issuer organization'),
      issuerCommonName: z.string().describe('Certificate issuer common name'),
      subjectCommonName: z.string().describe('Certificate subject common name'),
      validFrom: z.string().describe('Certificate validity start date'),
      validTo: z.string().describe('Certificate validity end date'),
      keyBits: z.number().describe('Key strength in bits'),
      isCa: z.boolean().describe('Whether this is a CA certificate'),
      serialNumber: z.string().describe('Certificate serial number'),
      subjectAltNames: z.string().optional().describe('Subject alternative names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.checkSsl(ctx.input.domain);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'SSL check failed');
    }

    let data = result.data;
    let output = {
      domain: data.domain,
      issuerOrganization: data.issuer?.O ?? '',
      issuerCommonName: data.issuer?.CN ?? '',
      subjectCommonName: data.subject?.CN ?? '',
      validFrom: data.valid_from,
      validTo: data.valid_to,
      keyBits: data.bits,
      isCa: data.ca,
      serialNumber: data.serialNumber,
      subjectAltNames: data.subjectaltname
    };

    return {
      output,
      message: `SSL certificate for **${data.domain}**: issued by ${data.issuer?.O ?? 'unknown'}, valid until ${data.valid_to}, ${data.bits}-bit key.`
    };
  })
  .build();
