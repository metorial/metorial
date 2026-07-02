import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSessionMetadata = SlateTool.create(spec, {
  name: 'Update Session Metadata',
  key: 'update_session_metadata',
  description: `Attach or update custom metadata on a visitor session. Use this for cross-domain tracking enrichment, marking signups, or storing any custom key-value data on a session. For example, you can set \`{"signup": true}\` to mark that a visitor has signed up.`
})
  .input(
    z.object({
      sessionId: z.string().describe('Unique session ID of the visitor session to update'),
      metadata: z
        .record(z.string(), z.unknown())
        .describe('Custom metadata key-value pairs to attach to the session')
    })
  )
  .output(
    z.object({
      session: z.record(z.string(), z.unknown()).describe('The updated session data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let session = await client.updateSession(ctx.input.sessionId, {
      metadata: ctx.input.metadata
    });

    return {
      output: {
        session
      },
      message: `Updated metadata on session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();
