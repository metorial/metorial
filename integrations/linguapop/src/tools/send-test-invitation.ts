import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTestInvitation = SlateTool.create(spec, {
  name: 'Send Test Invitation',
  key: 'send_test_invitation',
  description: `Create and optionally send a CEFR-aligned language placement test invitation to a candidate. Returns a direct test URL and invitation ID for tracking. You can choose to have Linguapop send the email or handle delivery yourself using the returned URL.`,
  instructions: [
    'Use language codes from the Get Languages tool (e.g., `eng`, `fra`, `spa`).',
    'Set `sendEmail` to `true` to have Linguapop deliver the invitation email, or `false` to handle delivery yourself.',
    'Provide a `callbackUrl` to receive test results via webhook when the candidate completes the test.'
  ]
})
  .input(
    z.object({
      candidateName: z.string().describe('Full name of the candidate taking the test'),
      candidateEmail: z.string().describe('Email address of the candidate'),
      languageCode: z
        .string()
        .describe('Language code for the test (e.g., eng, ita, spa, ger, fra)'),
      externalId: z
        .string()
        .optional()
        .describe('Optional external identifier for mapping to your CRM or internal system'),
      sendEmail: z
        .boolean()
        .optional()
        .describe(
          'Whether Linguapop should send the invitation email to the candidate. If false, use the returned test URL to deliver the test yourself'
        ),
      kioskMode: z
        .boolean()
        .optional()
        .describe(
          'Whether to generate a kiosk code so the candidate can access the test through a configured kiosk'
        ),
      includeReading: z
        .boolean()
        .optional()
        .describe('Whether to include a reading section in addition to the core grammar test'),
      includeListening: z
        .boolean()
        .optional()
        .describe(
          'Whether to include a listening section in addition to the core grammar test'
        ),
      returnUrl: z
        .string()
        .optional()
        .describe('URL to redirect the candidate to after completing the test'),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL to receive test results via webhook when the test is completed')
    })
  )
  .output(
    z.object({
      invitationId: z.string().describe('Unique identifier for the test invitation'),
      testUrl: z.string().describe('Direct URL to the placement test'),
      kioskCode: z
        .string()
        .optional()
        .describe(
          'Kiosk code for accessing the test through a configured kiosk (only present if kiosk mode was enabled)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createInvitation({
      candidateName: ctx.input.candidateName,
      candidateEmail: ctx.input.candidateEmail,
      languageCode: ctx.input.languageCode,
      externalId: ctx.input.externalId,
      sendEmail: ctx.input.sendEmail,
      kioskMode: ctx.input.kioskMode,
      includeReading: ctx.input.includeReading,
      includeListening: ctx.input.includeListening,
      returnUrl: ctx.input.returnUrl,
      callbackUrl: ctx.input.callbackUrl
    });

    let messageParts = [
      `Test invitation created for **${ctx.input.candidateName}** (${ctx.input.candidateEmail}).`,
      `Invitation ID: \`${result.invitationId}\``
    ];

    if (ctx.input.sendEmail) {
      messageParts.push('Invitation email sent by Linguapop.');
    } else {
      messageParts.push(`Test URL: ${result.testUrl}`);
    }

    if (result.kioskCode) {
      messageParts.push(`Kiosk code: \`${result.kioskCode}\``);
    }

    return {
      output: {
        invitationId: result.invitationId,
        testUrl: result.testUrl,
        kioskCode: result.kioskCode
      },
      message: messageParts.join('\n')
    };
  })
  .build();
