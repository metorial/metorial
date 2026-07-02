import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate an email address to check if it is properly formatted, has valid MX records, and can receive mail. Useful for form validation, lead quality checks, and cleaning email lists. Returns validation details including domain info, SMTP connectivity, typo detection, and whether the address is a free or company email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to validate')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The validated email address'),
      domain: z.string().describe('The domain part of the email'),
      username: z.string().describe('The local part of the email'),
      isValid: z.boolean().describe('Whether the email is valid overall'),
      canConnect: z
        .boolean()
        .describe('Whether a connection could be established to the mail server'),
      hasTypo: z.boolean().describe('Whether a typo was detected in the email'),
      isMxValid: z.boolean().describe('Whether the domain has valid MX records'),
      isSmtpValid: z.boolean().describe('Whether the SMTP server accepted the address'),
      isRegexValid: z.boolean().describe('Whether the email passes regex validation'),
      smtpValid: z.boolean().describe('SMTP validation result'),
      smtpReason: z.string().describe('Reason for the SMTP validation result'),
      isCompanyEmail: z.boolean().describe('Whether the email belongs to a company domain'),
      isFreeEmail: z.boolean().describe('Whether the email is from a free provider like Gmail')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.validateEmail(ctx.input.email);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Email validation failed');
    }

    let data = result.data;
    let output = {
      email: data.email,
      domain: data.domain,
      username: data.username,
      isValid: data.isValid,
      canConnect: data.canConnect,
      hasTypo: data.hasTypo,
      isMxValid: data.isMxValid,
      isSmtpValid: data.isSmtpValid,
      isRegexValid: data.isRegexValid,
      smtpValid: data.smtp?.valid ?? false,
      smtpReason: data.smtp?.reason ?? '',
      isCompanyEmail: data.isCompanyEmail,
      isFreeEmail: data.isFreeEmail
    };

    let status = data.isValid ? '**valid**' : '**invalid**';
    let extras: string[] = [];
    if (data.hasTypo) extras.push('possible typo detected');
    if (data.isFreeEmail) extras.push('free email provider');
    if (data.isCompanyEmail) extras.push('company email');

    return {
      output,
      message: `Email \`${ctx.input.email}\` is ${status}.${extras.length > 0 ? ` ${extras.join(', ')}.` : ''}`
    };
  })
  .build();
