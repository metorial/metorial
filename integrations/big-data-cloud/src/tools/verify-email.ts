import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmailTool = SlateTool.create(spec, {
  name: 'Verify Email Address',
  key: 'verify_email',
  description: `Verify an email address for format compliance (RFC 822/2822/5321), mail server configuration, spam domain detection, and disposable address detection. Does not use broken SMTP handshake or other intrusive techniques.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailAddress: z.string().describe('Email address to verify')
    })
  )
  .output(
    z
      .object({
        inputData: z.string().optional().describe('The email address that was verified'),
        isValid: z.boolean().describe('Overall verification result'),
        isSyntaxValid: z
          .boolean()
          .optional()
          .describe('Whether the email matches valid email syntax'),
        isMailServerDefined: z
          .boolean()
          .optional()
          .describe('Whether the domain has mail server (MX) records configured'),
        isKnownSpammerDomain: z
          .boolean()
          .optional()
          .describe('Whether the domain is known for sending spam'),
        isDisposable: z
          .boolean()
          .optional()
          .describe('Whether the email is from a disposable/temporary email service')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.emailVerify({
      emailAddress: ctx.input.emailAddress
    });

    let valid = result.isValid ? 'valid' : 'invalid';
    let warnings: string[] = [];
    if (result.isDisposable) warnings.push('disposable');
    if (result.isKnownSpammerDomain) warnings.push('spam domain');
    if (!result.isMailServerDefined) warnings.push('no mail server');

    let warningText = warnings.length > 0 ? ` Warnings: ${warnings.join(', ')}.` : '';

    return {
      output: result,
      message: `Email **${ctx.input.emailAddress}** is **${valid}**.${warningText}`
    };
  })
  .build();
