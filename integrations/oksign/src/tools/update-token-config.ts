import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTokenConfig = SlateTool.create(spec, {
  name: 'Update Token Config',
  key: 'update_token_config',
  description: `Update the callback URL, return URL, and/or webhook URL linked to the current organizational token (API key). These URLs control where OKSign sends signature callbacks, browser redirects, and notification delivery error reports.`,
  instructions: [
    'The callback URL receives HTTP GET requests when a document is signed.',
    "The return URL is used to redirect the signer's browser after signing.",
    'The webhook URL receives HTTP GET requests when email/SMS notifications fail.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      callbackUrl: z
        .string()
        .optional()
        .describe('URL called via HTTP GET when a document is signed'),
      returnUrl: z.string().optional().describe('URL to redirect the signer after signing'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL called via HTTP GET when notification delivery fails')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the configuration was updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateOrgTokenInfo({
      callbackURL: ctx.input.callbackUrl,
      returnURL: ctx.input.returnUrl,
      webhookURL: ctx.input.webhookUrl
    });

    let parts: string[] = [];
    if (ctx.input.callbackUrl) parts.push(`Callback URL: ${ctx.input.callbackUrl}`);
    if (ctx.input.returnUrl) parts.push(`Return URL: ${ctx.input.returnUrl}`);
    if (ctx.input.webhookUrl) parts.push(`Webhook URL: ${ctx.input.webhookUrl}`);

    return {
      output: { updated: true },
      message: `Token configuration updated:\n${parts.map(p => `- ${p}`).join('\n')}`
    };
  })
  .build();
