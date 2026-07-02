import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmbeddedSigningUrl = SlateTool.create(spec, {
  name: 'Create Embedded Signing URL',
  key: 'create_embedded_signing_url',
  description: `Generates a URL for embedded signing, allowing a recipient to sign documents directly within your application. The signer must have been created with a **clientUserId** when the envelope was sent.
The returned URL is valid for a limited time (typically 5 minutes).`,
  instructions: [
    'The signer must have been designated as an embedded signer (with clientUserId) when the envelope was created.',
    'The email, userName, and clientUserId must match the values used when the envelope was created.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope for signing'),
      email: z
        .string()
        .describe('Email address of the signer (must match the envelope recipient)'),
      userName: z
        .string()
        .describe('Full name of the signer (must match the envelope recipient)'),
      clientUserId: z
        .string()
        .describe(
          'Client user ID of the embedded signer (must match the value set when creating the envelope)'
        ),
      returnUrl: z
        .string()
        .describe('URL to redirect the signer to after signing is complete'),
      authenticationMethod: z
        .string()
        .optional()
        .default('none')
        .describe('Authentication method (e.g., "none", "email", "password", "phone")')
    })
  )
  .output(
    z.object({
      signingUrl: z.string().describe('URL to redirect the user to for embedded signing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let result = await client.createRecipientView(ctx.input.envelopeId, {
      returnUrl: ctx.input.returnUrl,
      authenticationMethod: ctx.input.authenticationMethod || 'none',
      email: ctx.input.email,
      userName: ctx.input.userName,
      clientUserId: ctx.input.clientUserId
    });

    return {
      output: {
        signingUrl: result.url
      },
      message: `Embedded signing URL generated for **${ctx.input.userName}** (${ctx.input.email}). URL is valid for ~5 minutes.`
    };
  })
  .build();
