import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackingClient } from '../lib/client';
import { spec } from '../spec';

export let identifyVisitor = SlateTool.create(spec, {
  name: 'Identify Visitor',
  key: 'identify_visitor',
  description: `Identifies a website visitor by connecting a SegMetrics session UID to a contact email address. This is the server-side equivalent of the JavaScript \`identify\` command.
Useful for identifying contacts from webhooks or backend systems without the JavaScript snippet.
The session UID is available in the browser via \`_segs.data.uid\`.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      segUid: z
        .string()
        .describe('The SegMetrics session UID (available in the browser via _segs.data.uid).'),
      email: z.string().describe('Email address to associate with the session.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the identification was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrackingClient({
      accountId: ctx.config.accountId
    });

    let response = await client.identifyVisitor({
      segUid: ctx.input.segUid,
      email: ctx.input.email
    });

    return {
      output: {
        success: true,
        response
      },
      message: `Visitor session **${ctx.input.segUid}** has been identified as **${ctx.input.email}**.`
    };
  })
  .build();
