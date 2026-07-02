import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateContact = SlateTool.create(spec, {
  name: 'Validate Email or Phone',
  key: 'validate_contact',
  description: `Validate an email address or phone number. For emails, checks format validity, whether it's a disposable address, and if the domain has valid MX records. For phone numbers, validates the format and identifies the country and carrier.`,
  instructions: ['Provide either an email or a phone number (or both) to validate.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address to validate'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number to validate (include country code, e.g. +14155552671)')
    })
  )
  .output(
    z.object({
      emailValidation: z
        .object({
          email: z.string().describe('The email that was checked'),
          isValid: z.boolean().describe('Whether the email format is valid'),
          isDisposable: z
            .boolean()
            .optional()
            .describe('Whether it is a disposable/temporary email'),
          hasMxRecords: z
            .boolean()
            .optional()
            .describe('Whether the domain has valid MX records')
        })
        .optional()
        .describe('Email validation results'),
      phoneValidation: z
        .object({
          phoneNumber: z.string().describe('The phone number that was checked'),
          isValid: z.boolean().describe('Whether the phone number is valid'),
          country: z.string().optional().describe('Associated country'),
          carrier: z.string().optional().describe('Phone carrier'),
          lineType: z.string().optional().describe('Line type (mobile, landline, etc.)')
        })
        .optional()
        .describe('Phone validation results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let messages: string[] = [];

    let emailResult: any;
    let phoneResult: any;

    let promises: Promise<void>[] = [];

    if (ctx.input.email) {
      promises.push(
        client.validateEmail(ctx.input.email).then(r => {
          emailResult = r;
        })
      );
    }
    if (ctx.input.phoneNumber) {
      promises.push(
        client.validatePhone(ctx.input.phoneNumber).then(r => {
          phoneResult = r;
        })
      );
    }

    await Promise.all(promises);

    let output: any = {};

    if (emailResult) {
      output.emailValidation = {
        email: emailResult.email ?? ctx.input.email,
        isValid: emailResult.is_valid ?? false,
        isDisposable: emailResult.is_disposable,
        hasMxRecords: emailResult.is_mx_found?.value ?? emailResult.has_mx_records
      };
      messages.push(
        `Email **${ctx.input.email}**: ${emailResult.is_valid ? '✓ valid' : '✗ invalid'}${emailResult.is_disposable ? ' (disposable)' : ''}`
      );
    }

    if (phoneResult) {
      output.phoneValidation = {
        phoneNumber: phoneResult.number ?? ctx.input.phoneNumber,
        isValid: phoneResult.is_valid ?? false,
        country: phoneResult.country,
        carrier: phoneResult.carrier,
        lineType: phoneResult.line_type ?? phoneResult.timezones
      };
      messages.push(
        `Phone **${ctx.input.phoneNumber}**: ${phoneResult.is_valid ? '✓ valid' : '✗ invalid'}${phoneResult.country ? ` (${phoneResult.country})` : ''}`
      );
    }

    return {
      output,
      message: messages.join('\n')
    };
  })
  .build();
