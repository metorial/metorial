import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailPass = SlateTool.create(spec, {
  name: 'Email Pass',
  key: 'email_pass',
  description: `Send a generated wallet pass to a recipient via email. The recipient will receive an email with a link to download and install the pass on their device.`
})
  .input(
    z.object({
      passTypeIdentifier: z
        .string()
        .describe('Pass type identifier (e.g., "pass.example.id1")'),
      serialNumber: z.string().describe('Unique serial number of the pass to send'),
      recipientEmail: z.string().describe('Email address of the recipient')
    })
  )
  .output(
    z.object({
      serialNumber: z.string().describe('Serial number of the emailed pass'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      recipientEmail: z.string().describe('Email address the pass was sent to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.emailPass(
      ctx.input.passTypeIdentifier,
      ctx.input.serialNumber,
      ctx.input.recipientEmail
    );

    return {
      output: {
        serialNumber: ctx.input.serialNumber,
        passTypeIdentifier: ctx.input.passTypeIdentifier,
        recipientEmail: ctx.input.recipientEmail
      },
      message: `Sent pass **${ctx.input.serialNumber}** to **${ctx.input.recipientEmail}**.`
    };
  })
  .build();
