import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let reissueCertificate = SlateTool.create(spec, {
  name: 'Reissue Certificate',
  key: 'reissue_certificate',
  description: `Reissue an existing certificate order with new parameters such as a new CSR, different SANs, or updated common name. The original certificate may be revoked after reissuance depending on account settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('Order ID of the certificate to reissue'),
      certificate: z
        .object({
          commonName: z.string().optional().describe('New primary domain name (if changing)'),
          csr: z.string().describe('New PEM-encoded CSR'),
          dnsNames: z
            .array(z.string())
            .optional()
            .describe('Updated Subject Alternative Names'),
          serverPlatform: z.number().optional().describe('Server platform ID'),
          signatureHash: z.string().optional().describe('Signature hash algorithm')
        })
        .describe('New certificate parameters'),
      comments: z.string().optional().describe('Comments for the reissue request')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Order ID'),
      requestId: z.number().optional().describe('Request ID if approval is needed'),
      certificateId: z.number().optional().describe('New certificate ID if issued immediately')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let body: Record<string, any> = {
      certificate: {
        common_name: ctx.input.certificate.commonName,
        csr: ctx.input.certificate.csr,
        dns_names: ctx.input.certificate.dnsNames,
        server_platform: ctx.input.certificate.serverPlatform
          ? { id: ctx.input.certificate.serverPlatform }
          : undefined,
        signature_hash: ctx.input.certificate.signatureHash || 'sha256'
      },
      comments: ctx.input.comments
    };

    ctx.progress('Submitting reissue request...');
    let result = await client.reissueCertificate(ctx.input.orderId, body);

    let orderId = Number(ctx.input.orderId);
    let requestId: number | undefined = result.requests?.[0]?.id;
    let certificateId: number | undefined = result.certificate_id;

    let message = `Certificate reissue for order **#${ctx.input.orderId}** submitted.`;
    if (certificateId) {
      message += ` New certificate issued (ID: ${certificateId}).`;
    } else if (requestId) {
      message += ` Pending approval (Request ID: ${requestId}).`;
    }

    return {
      output: { orderId, requestId, certificateId },
      message
    };
  })
  .build();
