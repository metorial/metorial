import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let getOrderValidation = SlateTool.create(spec, {
  name: 'Get Order Validation',
  key: 'get_order_validation',
  description:
    'Check the organization and domain validations required before DigiCert can issue a certificate order. Includes validation state, domain control methods, and optional domain risk status.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orderId: z
        .string()
        .min(1)
        .describe('Certificate order ID. Use list_orders to find orders.'),
      includeRiskCheck: z
        .boolean()
        .optional()
        .describe(
          'Include domain risk status for non-DV TLS orders. DV orders always include it.'
        )
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Certificate order ID'),
      orderStatus: z.string().describe('Order status'),
      nameScope: z.string().optional().describe('Order domain validation scope'),
      dcvMethod: z.string().optional().describe('Order domain control validation method'),
      organizationId: z.string().optional().describe('Organization ID; omitted for DV orders'),
      organizationName: z.string().optional().describe('Organization name'),
      organizationValidations: z
        .array(
          z.object({
            type: z.string(),
            name: z.string().optional(),
            status: z.string(),
            dateCreated: z.string().optional(),
            validatedUntil: z.string().optional(),
            verificationDetails: z
              .record(z.string(), z.string())
              .optional()
              .describe('Status of each organization verification component')
          })
        )
        .describe('Organization validations; empty for DV orders'),
      domainValidations: z
        .array(
          z.object({
            domainId: z.string().optional().describe('Domain ID; omitted for DV orders'),
            status: z.string(),
            dnsNames: z.array(z.string()),
            baseDomain: z.string().optional(),
            method: z
              .string()
              .optional()
              .describe('Domain-level DCV method; otherwise use the order method'),
            nameScope: z
              .string()
              .optional()
              .describe('Domain to validate; otherwise use the order scope'),
            riskStatus: z.string().optional()
          })
        )
        .describe('Domain validations required for the order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });
    let validation = await client.getOrderValidation(
      ctx.input.orderId,
      ctx.input.includeRiskCheck
    );
    return {
      output: {
        orderId: String(validation.order_id ?? ctx.input.orderId),
        orderStatus: validation.order_status,
        nameScope: validation.order_name_scope ?? undefined,
        dcvMethod: validation.order_dcv_method ?? undefined,
        organizationId:
          validation.organization_id == null ? undefined : String(validation.organization_id),
        organizationName: validation.organization_name ?? undefined,
        organizationValidations: (validation.organization_validations ?? []).map(
          (item: {
            type: string;
            name?: string | null;
            status: string;
            date_created?: string | null;
            validated_until?: string | null;
            verification_details?: Record<string, string> | null;
          }) => ({
            type: item.type,
            name: item.name ?? undefined,
            status: item.status,
            dateCreated: item.date_created ?? undefined,
            validatedUntil: item.validated_until ?? undefined,
            verificationDetails: item.verification_details ?? undefined
          })
        ),
        domainValidations: (validation.dns_name_validations ?? []).map(
          (item: {
            domain_id?: string | number | null;
            status: string;
            dns_names?: string[] | null;
            base_domain?: string | null;
            method?: string | null;
            name_scope?: string | null;
            risk_status?: string | null;
          }) => ({
            domainId: item.domain_id == null ? undefined : String(item.domain_id),
            status: item.status,
            dnsNames: item.dns_names ?? [],
            baseDomain: item.base_domain ?? undefined,
            method: item.method ?? undefined,
            nameScope: item.name_scope ?? undefined,
            riskStatus: item.risk_status ?? undefined
          })
        )
      },
      message: `Validation details retrieved for order **#${ctx.input.orderId}** (${validation.order_status}).`
    };
  })
  .build();
