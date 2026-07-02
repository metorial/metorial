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
          'reissue_revoked'
        ])
        .optional()
        .describe('Filter orders by status'),
      productNameId: z
        .string()
        .optional()
        .describe('Filter by product name ID (e.g., "ssl_plus", "ssl_ev_plus")'),
      commonName: z.string().optional().describe('Filter by common name (domain)'),
      offset: z.number().optional().describe('Pagination offset (default 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (default 25, max 1000)')
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

    let params: Record<string, any> = {};
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.productNameId) params.filters = { product_name_id: ctx.input.productNameId };
    if (ctx.input.commonName)
      params.filters = { ...params.filters, common_name: ctx.input.commonName };
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    let result = await client.listOrders(params);

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

    let totalCount = result.page?.total || orders.length;

    return {
      output: { orders, totalCount },
      message: `Found **${totalCount}** certificate order(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
