import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order Details',
  key: 'get_order',
  description: `Retrieve full details of a specific certificate order including certificate information, organization, product, validation status, and order history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('Certificate order ID')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Certificate order ID'),
      certificateId: z.number().optional().describe('Issued certificate ID'),
      status: z.string().describe('Order status'),
      commonName: z.string().optional().describe('Primary domain name'),
      dnsNames: z.array(z.string()).optional().describe('Subject Alternative Names'),
      signatureHash: z.string().optional().describe('Signature hash algorithm'),
      productName: z.string().optional().describe('Certificate product name'),
      productNameId: z.string().optional().describe('Product name ID'),
      organizationName: z.string().optional().describe('Organization name'),
      organizationId: z.number().optional().describe('Organization ID'),
      validFrom: z.string().optional().describe('Certificate validity start date'),
      validTill: z.string().optional().describe('Certificate validity end date'),
      orderValidTill: z.string().optional().describe('Order expiration date'),
      isRenewal: z.boolean().optional().describe('Whether this is a renewal order'),
      dateCreated: z.string().optional().describe('Order creation date'),
      csrCommonName: z.string().optional().describe('Common name from the CSR'),
      requests: z
        .array(
          z.object({
            requestId: z.number(),
            status: z.string(),
            dateCreated: z.string().optional()
          })
        )
        .optional()
        .describe('Associated approval requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let order = await client.getOrder(ctx.input.orderId);

    let output = {
      orderId: order.id,
      certificateId: order.certificate?.id,
      status: order.status,
      commonName: order.certificate?.common_name,
      dnsNames: order.certificate?.dns_names,
      signatureHash: order.certificate?.signature_hash,
      productName: order.product?.name,
      productNameId: order.product?.name_id,
      organizationName: order.organization?.name,
      organizationId: order.organization?.id,
      validFrom: order.certificate?.valid_from,
      validTill: order.certificate?.valid_till,
      orderValidTill: order.order_valid_till,
      isRenewal: order.is_renewal,
      dateCreated: order.date_created,
      csrCommonName: order.certificate?.csr_common_name,
      requests: order.requests?.map((r: any) => ({
        requestId: r.id,
        status: r.status,
        dateCreated: r.date
      }))
    };

    return {
      output,
      message: `Order **#${output.orderId}** for **${output.commonName || 'N/A'}** — status: **${output.status}**`
    };
  })
  .build();
