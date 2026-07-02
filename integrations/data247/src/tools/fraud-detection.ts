import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fraudDetection = SlateTool.create(spec, {
  name: 'Fraud Detection',
  key: 'fraud_detection',
  description: `Detect potential fraud using two methods: **User Identity** scoring cross-references signup details and returns a legitimacy score (1-100), where under 50 is suspicious and over 80 is likely legitimate. **Phone Spam** check determines whether a phone number is on known spam caller lists. Use **checkType** to select the method.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      checkType: z
        .enum(['identity', 'phone_spam'])
        .describe(
          '"identity" to score user signup legitimacy, "phone_spam" to check if a phone is a known spam caller'
        ),
      firstName: z.string().optional().describe("User's first name (identity check)"),
      lastName: z.string().optional().describe("User's last name (identity check)"),
      companyName: z
        .string()
        .optional()
        .describe('Company/organization name (identity check)'),
      companyUrl: z.string().optional().describe('Company website URL (identity check)'),
      address: z.string().optional().describe('Street address (identity check)'),
      city: z.string().optional().describe('City (identity check)'),
      state: z.string().optional().describe('State (identity check)'),
      zip: z.string().optional().describe('ZIP code (identity check)'),
      ip: z
        .string()
        .optional()
        .describe('IP address the user signed up from (identity check)'),
      email: z.string().optional().describe('Email address (identity check)'),
      phone: z
        .string()
        .optional()
        .describe('Phone number (required for phone_spam, optional for identity check)')
    })
  )
  .output(
    z.object({
      weight: z
        .string()
        .optional()
        .describe(
          'Legitimacy score from 1-100 (identity check). Under 50 is suspicious, over 80 is likely legitimate.'
        ),
      isSpam: z
        .string()
        .optional()
        .describe('Whether the phone number is a known spam caller (phone_spam check)'),
      phone: z.string().optional().describe('The queried phone number'),
      additionalAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional attributes returned by the service')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { checkType } = ctx.input;

    if (checkType === 'identity') {
      let raw = await client.trustIdentity({
        firstname: ctx.input.firstName,
        lastname: ctx.input.lastName,
        companyName: ctx.input.companyName,
        companyUrl: ctx.input.companyUrl,
        address: ctx.input.address,
        city: ctx.input.city,
        state: ctx.input.state,
        zip: ctx.input.zip,
        ip: ctx.input.ip,
        email: ctx.input.email,
        phone: ctx.input.phone
      });

      let { weight, ...rest } = raw;

      return {
        output: {
          weight,
          isSpam: undefined,
          phone: raw.phone,
          additionalAttributes: Object.keys(rest).length > 0 ? rest : undefined
        },
        message: `Identity fraud score: **${weight || 'N/A'}**/100. ${Number(weight) >= 80 ? 'Likely legitimate.' : Number(weight) < 50 ? 'Suspicious - review recommended.' : 'Moderate risk.'}`
      };
    } else {
      if (!ctx.input.phone) {
        throw new Error('Phone number is required for phone spam check.');
      }

      let raw = await client.trustPhone(ctx.input.phone);
      let { phone, spam, is_spam, ...rest } = raw;

      return {
        output: {
          weight: undefined,
          isSpam: spam || is_spam,
          phone,
          additionalAttributes: Object.keys(rest).length > 0 ? rest : undefined
        },
        message: `Phone spam check for **${ctx.input.phone}**: ${(spam || is_spam) === 'y' ? 'Known spam caller.' : 'Not flagged as spam.'}`
      };
    }
  })
  .build();
