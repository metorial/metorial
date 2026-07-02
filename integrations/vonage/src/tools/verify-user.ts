import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let verifyUser = SlateTool.create(spec, {
  name: 'Verify User',
  key: 'verify_user',
  description: `Start a user verification (2FA) request using the Vonage Verify v2 API. Sends a one-time code to the user via one or more channels (SMS, WhatsApp, voice, email, or silent authentication) with automatic failover.
Requires the **API Key, Secret & Application JWT** auth method.`,
  instructions: [
    'Define one or more workflow channels in order of preference. If the first channel fails, Vonage automatically tries the next.',
    'Supported channels: "sms", "whatsapp", "whatsapp_interactive", "voice", "email", "silent_auth".',
    'The "brand" appears in the verification message (e.g., "Your Acme code is: 1234").'
  ],
  constraints: [
    'Silent authentication requires the user to be on a mobile data connection.',
    'You are only charged for successful verifications.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      brand: z
        .string()
        .describe('Brand name shown in the verification message (e.g., "Acme Corp")'),
      to: z
        .string()
        .describe(
          'Phone number or email to verify in E.164 format for phone, or email address'
        ),
      workflows: z
        .array(
          z.object({
            channel: z
              .enum([
                'sms',
                'whatsapp',
                'whatsapp_interactive',
                'voice',
                'email',
                'silent_auth'
              ])
              .describe('Verification channel'),
            to: z.string().optional().describe('Override the "to" for this specific channel'),
            from: z.string().optional().describe('Sender ID for this channel')
          })
        )
        .min(1)
        .describe('Ordered list of verification channels with automatic failover'),
      codeLength: z
        .number()
        .optional()
        .describe('Length of the verification code (4-10, default: 4)'),
      channelTimeout: z
        .number()
        .optional()
        .describe('Seconds to wait before trying the next channel (default: 300)'),
      locale: z
        .string()
        .optional()
        .describe('Locale for the verification message (e.g., "en-us", "fr-fr")')
    })
  )
  .output(
    z.object({
      requestId: z
        .string()
        .describe('Verification request ID (needed to check or cancel the verification)'),
      checkUrl: z.string().optional().describe('URL to check the verification code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      applicationId: ctx.auth.applicationId,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.startVerification({
      brand: ctx.input.brand,
      to: ctx.input.to,
      workflows: ctx.input.workflows,
      codeLength: ctx.input.codeLength,
      channelTimeout: ctx.input.channelTimeout,
      locale: ctx.input.locale
    });

    let channels = ctx.input.workflows.map(w => w.channel).join(' -> ');
    return {
      output: result,
      message: `Verification started for **${ctx.input.to}** via **${channels}**. Request ID: \`${result.requestId}\``
    };
  })
  .build();
