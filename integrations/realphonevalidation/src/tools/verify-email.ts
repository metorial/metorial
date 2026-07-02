import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeErrorText = (errorText: string | Record<string, never>): string => {
  if (typeof errorText === 'string') return errorText;
  return '';
};

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email Address',
  key: 'verify_email',
  description: `Validates an email address in real-time to identify incorrect, disposable, and bogus addresses. Checks formatting standards, pings SMTP servers, validates MX records, and detects disposable email providers. Best used at the point of collection to prevent bad data from entering your database.`,
  constraints: ['API rate limit of 10 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to verify')
    })
  )
  .output(
    z.object({
      validityStatus: z
        .string()
        .describe('Email validity status: valid, invalid, unknown, or accept_all'),
      isDisposable: z
        .string()
        .optional()
        .describe('Whether the email is from a disposable/temporary provider'),
      isConnected: z
        .string()
        .optional()
        .describe('Whether the email is connected to active online networks'),
      errorText: z
        .string()
        .optional()
        .describe('Error message if verification encountered an issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.emailVerify(ctx.input.email);
    let errorText = normalizeErrorText(result.error_text);

    return {
      output: {
        validityStatus: result.status,
        isDisposable: result.disposable as string | undefined,
        isConnected: result.connected as string | undefined,
        errorText: errorText || undefined
      },
      message: `Email **${ctx.input.email}** is **${result.status}**${result.disposable ? `, disposable: ${result.disposable}` : ''}${result.connected ? `, connected: ${result.connected}` : ''}.`
    };
  })
  .build();
