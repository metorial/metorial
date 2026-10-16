import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackingClient } from '../lib/client';
import { resolveReportingConfig } from '../lib/context';
import { spec } from '../spec';

export let identifyVisitor = SlateTool.create(spec, {
  name: 'Identify Visitor',
  key: 'identify_visitor',
  description: `Identifies a website visitor by connecting a SegMetrics session UID to a contact email address or external contact ID. This is the server-side equivalent of the JavaScript \`identify\` command.
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
        .optional()
        .describe(
          'Optional SegMetrics session UID (available via _segs.data.uid). Omit to derive it from the email or contact ID.'
        ),
      email: z
        .string()
        .optional()
        .describe('Email address to associate. Required unless contactId is supplied.'),
      contactId: z
        .string()
        .optional()
        .describe('External contact ID to associate. Required unless email is supplied.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the identification was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrackingClient(resolveReportingConfig(ctx));

    let response = await client.identifyVisitor({
      segUid: ctx.input.segUid,
      email: ctx.input.email,
      contactId: ctx.input.contactId
    });

    return {
      output: {
        success: true,
        response
      },
      message: `Visitor ${ctx.input.segUid ? `session **${ctx.input.segUid}** ` : ''}has been identified as **${ctx.input.email || ctx.input.contactId}**.`
    };
  })
  .build();
