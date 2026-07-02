import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSession = SlateTool.create(spec, {
  name: 'Update Session',
  key: 'update_session',
  description: `Updates a session's name and/or recording access policy. Use this to rename sessions or control who can view session recordings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sessionUuid: z.string().describe('UUID of the session to update.'),
      name: z.string().min(1).max(512).describe('New name for the session.'),
      recordingAccessPolicy: z
        .array(z.enum(['participant', 'admin', 'teacher', 'student']))
        .optional()
        .describe(
          'Roles allowed to access the recording. An empty array defers to organisation default policy.'
        )
    })
  )
  .output(
    z.object({
      sessionId: z.number().describe('Internal session ID.'),
      sessionUuid: z.string().describe('Session UUID.'),
      name: z.string().nullable().describe('Updated session name.'),
      recordingAccessPolicy: z.any().describe('Updated recording access policy.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organisationId: ctx.config.organisationId
    });

    let session = await client.updateSession(ctx.input.sessionUuid, {
      name: ctx.input.name,
      recordingAccessPolicy: ctx.input.recordingAccessPolicy
    });

    return {
      output: {
        sessionId: session.id,
        sessionUuid: session.uuid,
        name: session.name,
        recordingAccessPolicy: session.recordingAccessPolicy
      },
      message: `Session **${session.name || session.uuid}** updated successfully.`
    };
  })
  .build();
