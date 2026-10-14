import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  orderId: z.number().describe('Certificate order ID'),
  certificateId: z.number().optional().describe('Issued certificate ID'),
  status: z
    .string()
    .describe('Order status (e.g., "issued", "pending", "rejected", "revoked", "expired")'),
  commonName: z.string().optional().describe('Primary domain name on the certificate'),
  productName: z.string().optional().describe('Certificate product name'),
  productNameId: z.string().optional().describe('Certificate product name ID'),
  organizationName: z.string().optional().describe('Organization name'),
  organizationId: z.number().optional().describe('Organization ID'),
  validFrom: z.string().optional().describe('Certificate validity start date'),
  validTill: z.string().optional().describe('Certificate validity end date'),
  orderValidTill: z.string().optional().describe('Order expiration date'),
  dnsNames: z.array(z.string()).optional().describe('Subject Alternative Names'),
  isRenewal: z.boolean().optional().describe('Whether this is a renewal order')
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Certificate Orders',
  key: 'list_orders',
  description: `Retrieve a list of certificate orders from DigiCert CertCentral. Supports filtering by status and product type, with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum([
          'pending',
          'rejected',
          'processing',
          'issued',
          'revoked',
          'canceled',
          'needs_csr',
          'needs_approval',
          'expired',
          'reissue_pending',
          'reissue_revoked',
          'waiting_pickup',
          'active_issued'
        ])
        .optional()
        .describe('Filter orders by status'),
      productNameId: z
        .string()
        .optional()
        .describe('Filter by product name ID (e.g., "ssl_plus", "ssl_ev_plus")'),
      commonName: z.string().optional().describe('Filter by common name (domain)'),
      offset: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number')
        .nonnegative()
        .optional()
        .describe('Pagination offset (default 0)'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number')
        .nonnegative()
        .max(5000)
        .optional()
        .describe('Number of results to return (default 1000, max 5000)')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of certificate orders'),
      totalCount: z.number().describe('Total number of matching orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let result = await client.listOrders(ctx.input);

    let orders = (result.orders || []).map((order: any) => ({
      orderId: order.id,
      certificateId: order.certificate?.id,
      status: order.status,
      commonName: order.certificate?.common_name,
      productName: order.product?.name,
      productNameId: order.product?.name_id,
      organizationName: order.organization?.name,
      organizationId: order.organization?.id,
      validFrom: order.certificate?.valid_from,
      validTill: order.certificate?.valid_till,
      orderValidTill: order.order_valid_till,
      dnsNames: order.certificate?.dns_names,
      isRenewal: order.is_renewal
    }));

    let totalCount = result.page?.total ?? orders.length;

    return {
      output: { orders, totalCount },
      message: `Found **${totalCount}** certificate order(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
