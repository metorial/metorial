import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let orderCertificate = SlateTool.create(spec, {
  name: 'Order Certificate',
  key: 'order_certificate',
  description: `Order a new TLS/SSL certificate through DigiCert CertCentral. Supports OV, EV, wildcard, multi-domain, and other certificate types.
Provide the product type identifier and required fields such as CSR, common name, validity period, and organization.`,
  instructions: [
    'Use "ssl_plus" for standard OV SSL, "ssl_ev_plus" for EV SSL, "ssl_wildcard" for wildcard, "ssl_multi_domain" for multi-domain SAN certificates.',
    'A valid CSR (Certificate Signing Request) is required for most certificate types.',
    'The organization must already exist and be validated for the requested certificate type.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productType: z
        .string()
        .describe(
          'DigiCert product name ID (e.g., "ssl_plus", "ssl_ev_plus", "ssl_wildcard", "ssl_multi_domain", "client_premium")'
        ),
      certificate: z
        .object({
          commonName: z.string().describe('Primary domain name for the certificate'),
          csr: z.string().describe('PEM-encoded Certificate Signing Request'),
          dnsNames: z
            .array(z.string())
            .optional()
            .describe(
              'Additional Subject Alternative Names (SANs) for multi-domain certificates'
            ),
          serverPlatform: z
            .number()
            .optional()
            .describe('Server platform ID (-1 for other/unknown)'),
          signatureHash: z
            .string()
            .optional()
            .describe('Signature hash algorithm (e.g., "sha256")')
        })
        .describe('Certificate details'),
      organizationId: z
        .number()
        .describe('ID of the organization to associate with the certificate'),
      validityYears: z.number().optional().describe('Certificate validity in years (1 or 2)'),
      validityDays: z
        .number()
        .optional()
        .describe('Certificate validity in days (overrides validityYears)'),
      comments: z.string().optional().describe('Comments or notes for the order'),
      disableRenewalNotifications: z
        .boolean()
        .optional()
        .describe('Disable renewal notification emails'),
      paymentMethod: z
        .enum(['balance', 'card', 'profile'])
        .optional()
        .describe('Payment method for the order')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('ID of the created certificate order'),
      requestId: z
        .number()
        .optional()
        .describe('ID of the approval request if order requires approval'),
      certificateId: z
        .number()
        .optional()
        .describe('ID of the issued certificate if issued immediately'),
      certificateChain: z
        .array(
          z.object({
            subjectCommonName: z.string().optional(),
            pem: z.string().optional()
          })
        )
        .optional()
        .describe('Certificate chain if certificate was issued immediately')
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
      organization: { id: ctx.input.organizationId },
      comments: ctx.input.comments,
      disable_renewal_notifications: ctx.input.disableRenewalNotifications,
      payment_method: ctx.input.paymentMethod
    };

    if (ctx.input.validityDays) {
      body.validity_days = ctx.input.validityDays;
    } else if (ctx.input.validityYears) {
      body.validity_years = ctx.input.validityYears;
    }

    ctx.progress('Submitting certificate order...');
    let result = await client.orderCertificate(ctx.input.productType, body);

    let orderId: number = result.id;
    let requestId: number | undefined = result.requests?.[0]?.id;
    let certificateId: number | undefined = result.certificate_id;
    let certificateChain = result.certificate_chain?.map((cert: any) => ({
      subjectCommonName: cert.subject_common_name,
      pem: cert.pem
    }));

    let message = `Certificate order **#${orderId}** created for **${ctx.input.certificate.commonName}** (${ctx.input.productType}).`;
    if (certificateId) {
      message += ` Certificate issued immediately (ID: ${certificateId}).`;
    } else if (requestId) {
      message += ` Order pending approval (Request ID: ${requestId}).`;
    }

    return {
      output: { orderId, requestId, certificateId, certificateChain },
      message
    };
  })
  .build();
