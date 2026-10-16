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
      rawData: z.any().optional().describe('Complete provider result'),
      domain: z.string().describe('The checked domain'),
      issuerOrganization: z.string().optional().describe('Certificate issuer organization'),
      issuerCommonName: z.string().optional().describe('Certificate issuer common name'),
      subjectCommonName: z.string().optional().describe('Certificate subject common name'),
      validFrom: z.string().describe('Certificate validity start date'),
      validTo: z.string().describe('Certificate validity end date'),
      keyBits: z.number().describe('Key strength in bits'),
      isCa: z.boolean().describe('Whether this is a CA certificate'),
      serialNumber: z.string().optional().describe('Certificate serial number'),
      subjectAltNames: z.string().optional().describe('Subject alternative names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.checkSsl(ctx.input.domain);

    let data = result.data;
    let output = {
      rawData: data,
      domain: data.domain,
      issuerOrganization: data.issuer?.O,
      issuerCommonName: data.issuer?.CN,
      subjectCommonName: data.subject?.CN,
      validFrom: data.valid_from,
      validTo: data.valid_to,
      keyBits: data.bits,
      isCa: data.ca,
      serialNumber: data.serialNumber,
      subjectAltNames: data.subjectaltname
    };

    let issuerText = data.issuer?.O !== undefined ? `issued by ${data.issuer.O}, ` : '';

    return {
      output: client.sanitize(output),
      message: client.sanitize(
        `SSL certificate for **${data.domain}**: ${issuerText}valid until ${data.valid_to}, ${data.bits}-bit key.`
      )
    };
  })
  .build();
