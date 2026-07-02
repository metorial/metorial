import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

let subStatusSchema = z
  .object({
    code: z.number().optional().describe('Verification sub-status code'),
    desc: z.string().optional().describe('Verification sub-status description')
  })
  .optional();

let detailInfoSchema = z
  .object({
    account: z.string().optional().describe('Local part of the email address'),
    domain: z.string().optional().describe('Domain part of the email address'),
    mxRecord: z.string().optional().describe('MX record for the domain'),
    smtpProvider: z.string().optional().describe('SMTP provider name')
  })
  .optional();

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real-time to determine its deliverability status. Returns comprehensive validation results including safe-to-send flag, disposable/free/role detection, AI verdict, and detailed domain info.
Use this to proactively check email validity before sending, clean individual addresses, or validate emails at point of capture.`,
  constraints: [
    'Consumes 1 credit per verification.',
    'Rate limits apply based on your subscription plan.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to verify'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum time in milliseconds for verification (e.g., 30000 for 30 seconds)')
    })
  )
  .output(
    z.object({
      emailAddress: z.string().describe('The email address that was verified'),
      status: z
        .string()
        .describe('Verification status: valid, invalid, unknown, or catch_all'),
      subStatus: subStatusSchema.describe(
        'Sub-status with code and description for more detail'
      ),
      safeToSend: z.string().describe('Whether the email is safe to send to (yes/no)'),
      disposable: z.string().describe('Whether the email uses a disposable domain (yes/no)'),
      free: z.string().describe('Whether the email is from a free mail service (yes/no)'),
      role: z
        .string()
        .describe(
          'Whether the email is a role-based address like admin@ or support@ (yes/no)'
        ),
      gibberish: z.string().describe('Whether the email appears to be gibberish (yes/no)'),
      aiVerdict: z
        .string()
        .optional()
        .describe('AI-generated verdict about email deliverability'),
      suggestedEmailAddress: z
        .string()
        .optional()
        .describe('Suggested correction if a typo is detected'),
      bounceType: z.string().optional().describe('Type of bounce, if applicable'),
      detailInfo: detailInfoSchema.describe(
        'Detailed info including account, domain, MX record, and SMTP provider'
      ),
      verifiedOn: z
        .string()
        .optional()
        .describe('Timestamp of when the verification occurred'),
      timeTaken: z.number().optional().describe('Time taken for verification in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.verifyEmail({
      email: ctx.input.email,
      timeout: ctx.input.timeout
    });

    let data = (result.data ?? result) as Record<string, unknown>;
    let detailInfo = data.detail_info as Record<string, unknown> | undefined;
    let subStatus = data.sub_status as Record<string, unknown> | undefined;

    let output = {
      emailAddress: String(data.email_address ?? ctx.input.email),
      status: String(data.status ?? 'unknown'),
      subStatus: subStatus
        ? {
            code: subStatus.code as number | undefined,
            desc: subStatus.desc as string | undefined
          }
        : undefined,
      safeToSend: String(data.safe_to_send ?? 'unknown'),
      disposable: String(data.disposable ?? 'unknown'),
      free: String(data.free ?? 'unknown'),
      role: String(data.role ?? 'unknown'),
      gibberish: String(data.gibberish ?? 'unknown'),
      aiVerdict: data.ai_verdict as string | undefined,
      suggestedEmailAddress: data.suggested_email_address as string | undefined,
      bounceType: data.bounce_type as string | undefined,
      detailInfo: detailInfo
        ? {
            account: detailInfo.account as string | undefined,
            domain: detailInfo.domain as string | undefined,
            mxRecord: detailInfo.mx_record as string | undefined,
            smtpProvider: detailInfo.smtp_provider as string | undefined
          }
        : undefined,
      verifiedOn: data.verified_on as string | undefined,
      timeTaken: data.time_taken as number | undefined
    };

    return {
      output,
      message: `**${output.emailAddress}** — Status: **${output.status}**, Safe to send: **${output.safeToSend}**${output.aiVerdict ? `\n\n${output.aiVerdict}` : ''}`
    };
  })
  .build();
