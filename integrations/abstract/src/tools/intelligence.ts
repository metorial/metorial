import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let emailReputation = SlateTool.create(spec, {
  key: 'email_reputation',
  name: 'Email Reputation',
  description:
    'Assess email deliverability, address and domain risk, sender details, and known breaches. Requires a separate Email Reputation API key.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ email: z.string().describe('Email address to assess') }))
  .output(
    z.object({
      email: z.string(),
      deliverability: z.string().optional(),
      addressRisk: z.string().optional(),
      domainRisk: z.string().optional(),
      rawResponse: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete reputation report, including sender, domain, quality, risk, and breach details'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result: unknown = await new AbstractClient(ctx.auth).emailReputation(ctx.input);
    if (!isApiErrorRecord(result))
      throw createApiServiceError(
        'Abstract returned an unexpected email reputation response.'
      );
    let delivery = isApiErrorRecord(result.email_deliverability)
      ? result.email_deliverability
      : {};
    let risk = isApiErrorRecord(result.email_risk) ? result.email_risk : {};
    return {
      output: {
        email:
          typeof result.email_address === 'string' ? result.email_address : ctx.input.email,
        deliverability: typeof delivery.status === 'string' ? delivery.status : undefined,
        addressRisk:
          typeof risk.address_risk_status === 'string' ? risk.address_risk_status : undefined,
        domainRisk:
          typeof risk.domain_risk_status === 'string' ? risk.domain_risk_status : undefined,
        rawResponse: result
      },
      message: `Retrieved reputation details for **${ctx.input.email}**.`
    };
  })
  .build();

export let phoneIntelligence = SlateTool.create(spec, {
  key: 'phone_intelligence',
  name: 'Phone Intelligence',
  description:
    'Look up phone validity, line status, carrier, messaging, registration, risk, and breach details. Requires a separate Phone Intelligence API key.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe('Phone number, preferably including the international calling code'),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code for a number without an international calling code')
    })
  )
  .output(
    z.object({
      phone: z.string(),
      isValid: z.boolean().optional(),
      lineStatus: z.string().optional(),
      riskLevel: z.string().optional(),
      rawResponse: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete phone intelligence report, including nullable and product-specific details'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result: unknown = await new AbstractClient(ctx.auth).phoneIntelligence(ctx.input);
    if (!isApiErrorRecord(result))
      throw createApiServiceError(
        'Abstract returned an unexpected phone intelligence response.'
      );
    let validation = isApiErrorRecord(result.phone_validation) ? result.phone_validation : {};
    let risk = isApiErrorRecord(result.phone_risk) ? result.phone_risk : {};
    return {
      output: {
        phone: typeof result.phone_number === 'string' ? result.phone_number : ctx.input.phone,
        isValid: typeof validation.is_valid === 'boolean' ? validation.is_valid : undefined,
        lineStatus:
          typeof validation.line_status === 'string' ? validation.line_status : undefined,
        riskLevel: typeof risk.risk_level === 'string' ? risk.risk_level : undefined,
        rawResponse: result
      },
      message: `Retrieved intelligence details for **${ctx.input.phone}**.`
    };
  })
  .build();

export let ipIntelligence = SlateTool.create(spec, {
  key: 'ip_intelligence',
  name: 'IP Intelligence',
  description:
    'Assess VPN, proxy, Tor, hosting, relay, mobile, and abuse signals alongside IP location, ASN, company, and domain details. Requires a separate IP Intelligence API key.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ipAddress: z
        .string()
        .optional()
        .describe(
          'IPv4 or IPv6 address. If omitted, analyzes the IP address sending the request.'
        ),
      fields: z.string().optional().describe('Comma-separated response fields to request')
    })
  )
  .output(
    z.object({
      ipAddress: z.string().optional(),
      isVpn: z.boolean().optional(),
      isProxy: z.boolean().optional(),
      isTor: z.boolean().optional(),
      isAbuse: z.boolean().optional(),
      rawResponse: z
        .record(z.string(), z.unknown())
        .describe('Complete IP intelligence report, including unavailable values')
    })
  )
  .handleInvocation(async ctx => {
    let result: unknown = await new AbstractClient(ctx.auth).ipIntelligence(ctx.input);
    if (!isApiErrorRecord(result))
      throw createApiServiceError('Abstract returned an unexpected IP intelligence response.');
    let security = isApiErrorRecord(result.security) ? result.security : {};
    return {
      output: {
        ipAddress: typeof result.ip_address === 'string' ? result.ip_address : undefined,
        isVpn: typeof security.is_vpn === 'boolean' ? security.is_vpn : undefined,
        isProxy: typeof security.is_proxy === 'boolean' ? security.is_proxy : undefined,
        isTor: typeof security.is_tor === 'boolean' ? security.is_tor : undefined,
        isAbuse: typeof security.is_abuse === 'boolean' ? security.is_abuse : undefined,
        rawResponse: result
      },
      message: 'Retrieved IP intelligence and security details.'
    };
  })
  .build();
