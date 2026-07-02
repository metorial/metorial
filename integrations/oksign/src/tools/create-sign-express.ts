import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSignExpress = SlateTool.create(spec, {
  name: 'Create SignExpress',
  key: 'create_sign_express',
  description: `Create an embedded "Sign now" signing flow for face-to-face signing scenarios. Generates a time-limited signing URL for a specific signer and set of documents that can be embedded in your application. Default validity is 90 days.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentIds: z
        .array(z.string())
        .describe('Document IDs to include in the signing session'),
      signerId: z.string().describe('Signer ID for the signing session'),
      validityDays: z
        .number()
        .optional()
        .describe('Number of days the signing URL remains valid (default: 90)'),
      callbackUrl: z.string().optional().describe('URL called when a document is signed'),
      returnUrl: z.string().optional().describe('URL to redirect the signer after signing')
    })
  )
  .output(
    z.object({
      signExpressDetails: z
        .any()
        .describe('SignExpress session details including signing URL and token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSignExpress({
      documents: ctx.input.documentIds.map(id => ({ docid: id })),
      signerid: ctx.input.signerId,
      validity: ctx.input.validityDays,
      callbackURL: ctx.input.callbackUrl,
      returnURL: ctx.input.returnUrl
    });

    return {
      output: { signExpressDetails: result },
      message: `SignExpress session created for **${ctx.input.documentIds.length}** document(s).`
    };
  })
  .build();

export let getSignExpress = SlateTool.create(spec, {
  name: 'Get SignExpress',
  key: 'get_sign_express',
  description: `Retrieve configuration and details of an existing SignExpress session.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      signExpressTokenId: z.string().describe('SignExpress token ID')
    })
  )
  .output(
    z.object({
      signExpressDetails: z.any().describe('SignExpress session configuration and status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let signExpressDetails = await client.retrieveSignExpress(ctx.input.signExpressTokenId);

    return {
      output: { signExpressDetails },
      message: `SignExpress session \`${ctx.input.signExpressTokenId}\` retrieved.`
    };
  })
  .build();

export let removeSignExpress = SlateTool.create(spec, {
  name: 'Remove SignExpress',
  key: 'remove_sign_express',
  description: `Delete a SignExpress session from the OKSign platform, invalidating its signing URL.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      signExpressTokenId: z.string().describe('SignExpress token ID to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the session was removed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeSignExpress(ctx.input.signExpressTokenId);

    return {
      output: { removed: true },
      message: `SignExpress session \`${ctx.input.signExpressTokenId}\` removed.`
    };
  })
  .build();
