import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendLinkedInMessage = SlateTool.create(spec, {
  name: 'Send LinkedIn Message',
  key: 'send_linkedin_message',
  description: `Send a LinkedIn message to a lead through La Growth Machine. The lead can be identified by their LGM lead ID or LinkedIn profile URL. Requires specifying which identity to send the message from.`,
  instructions: [
    'The lead must already exist in your La Growth Machine account.',
    'You must have a connected LinkedIn identity to send messages.'
  ]
})
  .input(
    z.object({
      identityId: z
        .string()
        .describe(
          'ID of the connected identity to send the message from. Use the List Identities tool to find available identities.'
        ),
      message: z.string().describe('The LinkedIn message content to send'),
      leadId: z.string().optional().describe('La Growth Machine lead ID'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the recipient')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Confirmation of the message delivery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendLinkedInMessage({
      identityId: ctx.input.identityId,
      message: ctx.input.message,
      leadId: ctx.input.leadId,
      linkedinUrl: ctx.input.linkedinUrl
    });

    return {
      output: { result },
      message: `LinkedIn message sent successfully.`
    };
  })
  .build();
