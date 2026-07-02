import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

export let checkRisk = SlateTool.create(spec, {
  name: 'Check Risk Score',
  key: 'check_risk',
  description: `Calculate a risk score for a signup or transaction by checking an email and IP address against fraud indicators. Detects disposable emails, blacklisted IPs, proxy usage, name mismatches, and more. Useful for fraud prevention and spam detection.`,
  instructions: [
    'Provide both email and IP for the most accurate risk assessment.',
    "Optionally include the person's name for name-email matching analysis."
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to check'),
      ip: z.string().describe('IP address to check'),
      name: z.string().optional().describe("Person's full name for name-email matching"),
      givenName: z.string().optional().describe('First name'),
      familyName: z.string().optional().describe('Last name'),
      countryCode: z.string().optional().describe('Expected country code for geo-matching'),
      zipCode: z.string().optional().describe('Expected ZIP code for geo-matching')
    })
  )
  .output(
    z.object({
      riskId: z.string().describe('Risk calculation identifier'),
      live: z.boolean().describe('Whether the check was performed in real-time'),
      riskLevel: z.string().describe('Overall risk level (e.g., "low", "medium", "high")'),
      riskScore: z.number().describe('Numeric risk score (0-100)'),
      riskReasons: z
        .array(z.string())
        .describe('List of reasons contributing to the risk score'),
      emailValid: z.boolean().nullable().describe('Whether the email address is valid'),
      emailDisposable: z
        .boolean()
        .nullable()
        .describe('Whether the email is from a disposable provider'),
      emailFreeProvider: z
        .boolean()
        .nullable()
        .describe('Whether the email is from a free provider'),
      emailBlacklisted: z.boolean().nullable().describe('Whether the email is blacklisted'),
      emailNameMatch: z.boolean().nullable().describe('Whether the name matches the email'),
      emailSocialMatch: z
        .boolean()
        .nullable()
        .describe('Whether the email matches social profiles'),
      emailCompanyMatch: z
        .boolean()
        .nullable()
        .describe('Whether the email matches company records'),
      ipProxy: z.boolean().nullable().describe('Whether the IP is a proxy or VPN'),
      ipBlacklisted: z.boolean().nullable().describe('Whether the IP is blacklisted'),
      ipGeoMatch: z.boolean().nullable().describe('Whether the IP geolocation matches'),
      ipRateLimited: z.boolean().nullable().describe('Whether the IP has been rate-limited'),
      addressGeoMatch: z
        .boolean()
        .nullable()
        .describe('Whether the address matches geolocation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let result = await client.calculateRisk({
      email: ctx.input.email,
      ip: ctx.input.ip,
      name: ctx.input.name,
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      countryCode: ctx.input.countryCode,
      zipCode: ctx.input.zipCode
    });

    let output = {
      riskId: result.id,
      live: result.live,
      riskLevel: result.risk.level,
      riskScore: result.risk.score,
      riskReasons: result.risk.reasons,
      emailValid: result.email?.valid ?? null,
      emailDisposable: result.email?.disposable ?? null,
      emailFreeProvider: result.email?.freeProvider ?? null,
      emailBlacklisted: result.email?.blacklisted ?? null,
      emailNameMatch: result.email?.nameMatch ?? null,
      emailSocialMatch: result.email?.socialMatch ?? null,
      emailCompanyMatch: result.email?.companyMatch ?? null,
      ipProxy: result.ip?.proxy ?? null,
      ipBlacklisted: result.ip?.blacklisted ?? null,
      ipGeoMatch: result.ip?.geoMatch ?? null,
      ipRateLimited: result.ip?.rateLimited ?? null,
      addressGeoMatch: result.address?.geoMatch ?? null
    };

    let reasonsText =
      output.riskReasons.length > 0 ? ` Reasons: ${output.riskReasons.join(', ')}.` : '';

    return {
      output,
      message: `Risk score: **${output.riskScore}/100** (${output.riskLevel}).${reasonsText}`
    };
  })
  .build();
