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
      name: z.string().describe('Name of the new mailbox')
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
    let mb = await client.createMailbox({ name: ctx.input.name });

    return {
      output: {
        mailboxId: mb._id || mb.id,
        name: mb.name,
        email: mb.email
      },
      message: `Created mailbox **${mb.name || ctx.input.name}**.`
    };
  })
  .build();
