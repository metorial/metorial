import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let listParticipants = SlateTool.create(spec, {
  name: 'List Workspace Participants',
  key: 'list_participants',
  description: `List participants (users and teams) with access to the current workspace. Shows role assignments and membership details for access control management.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      participants: z
        .array(
          z.object({
            participantId: z.number().optional().describe('Participant ID'),
            userName: z.string().optional().describe('Username'),
            email: z.string().optional().describe('Email address'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            role: z
              .string()
              .optional()
              .describe(
                'Role in the workspace (OWNER, ADMIN, MAINTAIN, LAUNCH, CONNECT, VIEW)'
              ),
            teamName: z.string().optional().describe('Team name if this is a team participant')
          })
        )
        .describe('List of workspace participants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let participants = await client.listParticipants();

    return {
      output: {
        participants: participants.map(p => ({
          participantId: p.participantId,
          userName: p.userName,
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          role: p.role,
          teamName: p.teamName
        }))
      },
      message: `Found **${participants.length}** workspace participants.`
    };
  })
  .build();
