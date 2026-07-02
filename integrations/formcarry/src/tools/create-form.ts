import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createForm = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Creates a new Formcarry form endpoint that can receive submissions. Returns the unique form URL to use as the action target in your HTML or JavaScript forms. You can configure notification emails, redirect URLs, spam protection, webhook URL, and a custom thank-you page.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      formName: z.string().describe('Name to identify the form'),
      notificationEmail: z
        .string()
        .optional()
        .describe(
          'Email address(es) to receive submission notifications. Comma-separated for multiple.'
        ),
      returnUrl: z
        .string()
        .optional()
        .describe('URL to redirect the user to after a successful submission'),
      failUrl: z
        .string()
        .optional()
        .describe('URL to redirect the user to after a failed submission'),
      returnParams: z
        .boolean()
        .optional()
        .describe('Whether to include form data in the redirect URL query string'),
      recaptchaSecretKey: z
        .string()
        .optional()
        .describe('Google reCAPTCHA secret key for spam protection'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive submission data in real-time'),
      retainSubmissions: z
        .boolean()
        .optional()
        .describe('Whether to save submissions. Defaults to true.'),
      thankYouPage: z
        .object({
          theme: z
            .enum(['Fancy', 'Formal', 'Sweet'])
            .optional()
            .describe('Visual theme for the thank-you page'),
          headline: z.string().optional().describe('Custom headline text'),
          message: z.string().optional().describe('Custom message body'),
          mode: z
            .enum(['Light', 'Dark', 'System'])
            .optional()
            .describe('Color mode for the thank-you page'),
          returnText: z.string().optional().describe('Text for the return button'),
          returnUrl: z.string().optional().describe('URL for the return button')
        })
        .optional()
        .describe('Customization for the built-in thank-you page shown after submission')
    })
  )
  .output(
    z.object({
      formUrl: z
        .string()
        .describe('The unique form endpoint URL to use as the form action target'),
      statusMessage: z.string().describe('Status message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createForm({
      name: ctx.input.formName,
      email: ctx.input.notificationEmail,
      returnUrl: ctx.input.returnUrl,
      failUrl: ctx.input.failUrl,
      returnParams: ctx.input.returnParams,
      googleRecaptcha: ctx.input.recaptchaSecretKey,
      webhook: ctx.input.webhookUrl,
      retention: ctx.input.retainSubmissions,
      thankYouPage: ctx.input.thankYouPage
    });

    return {
      output: {
        formUrl: result.formUrl,
        statusMessage: result.message
      },
      message: `Created form **${ctx.input.formName}**. Form endpoint: ${result.formUrl}`
    };
  });
