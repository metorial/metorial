import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSenderView = SlateTool.create(spec, {
  name: 'Create Sender View',
  key: 'create_sender_view',
  description: `Generates a URL for the embedded DocuSign sender view, allowing a user to prepare, tag, and send a draft envelope in your application.`,
  instructions: [
    'The envelope must be in the "created" draft state.',
    'DocuSign sender view URLs expire after about 10 minutes and should be used immediately.',
    'This tool uses DocuSign\'s current sender view request format with viewAccess set to "envelope".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the draft envelope to open in sender view'),
      returnUrl: z
        .string()
        .describe('URL to redirect to when the sender view completes or exits'),
      startingScreen: z
        .enum(['Prepare', 'Tagger'])
        .optional()
        .describe('Optional initial sender view screen. Defaults to DocuSign behavior.'),
      showBackButton: z
        .boolean()
        .optional()
        .describe('Whether the embedded sender view should show the back button'),
      showEditRecipients: z
        .boolean()
        .optional()
        .describe('Whether the embedded sender view should allow editing recipients')
    })
  )
  .output(
    z.object({
      senderViewUrl: z.string().describe('URL to open for embedded envelope preparation'),
      expiresInMinutes: z.number().describe('Approximate sender view URL lifetime')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let settings: Record<string, string> = {};
    if (ctx.input.startingScreen) settings.startingScreen = ctx.input.startingScreen;
    if (ctx.input.showBackButton !== undefined) {
      settings.showBackButton = String(ctx.input.showBackButton);
    }
    if (ctx.input.showEditRecipients !== undefined) {
      settings.showEditRecipients = String(ctx.input.showEditRecipients);
    }

    let result = await client.createSenderView(ctx.input.envelopeId, {
      returnUrl: ctx.input.returnUrl,
      viewAccess: 'envelope',
      settings: Object.keys(settings).length > 0 ? settings : undefined
    });

    return {
      output: {
        senderViewUrl: result.url,
        expiresInMinutes: 10
      },
      message: `Embedded sender view URL generated for draft envelope **${ctx.input.envelopeId}**.`
    };
  })
  .build();
