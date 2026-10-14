import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMailbox = SlateTool.create(spec, {
  name: 'Create Mailbox',
  key: 'create_mailbox',
  description: `Create a new mailbox in Parsio.io. A mailbox is the core organizational unit where documents can be forwarded for parsing via its unique email address.`
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name of the new mailbox'),
      preset: z.string().optional().describe('Parser type or preset configured in Parsio'),
      mlModel: z
        .string()
        .optional()
        .describe('OCR or AI model supported by the selected parser'),
      hasRawData: z.boolean().optional().describe('Whether to retain raw document data'),
      parseSig: z.boolean().optional().describe('Whether to parse email signatures')
    })
  )
  .output(
    z.object({
      mailboxId: z.string().describe('Unique identifier of the created mailbox'),
      name: z.string().optional().describe('Name of the created mailbox'),
      email: z.string().optional().describe('Email address assigned to the mailbox')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let mb = await client.createMailbox(ctx.input);

    return {
      output: {
        mailboxId: mb._id || mb.id,
        name: mb.name ?? undefined,
        email: mb.email ?? undefined
      },
      message: `Created mailbox **${mb.name || ctx.input.name}**.`
    };
  })
  .build();
