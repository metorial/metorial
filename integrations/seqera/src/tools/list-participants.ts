import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listParticipants = SlateTool.create(spec, {
  name: 'List Workspace Participants',
  key: 'list_participants',
  description: `List participants (users and teams) with access to the current workspace. Shows role assignments and membership details for access control management.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      orgId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Organization ID from list_organizations. Omit to discover the organization containing the workspace.'
        ),
      max: z.number().int().min(1).max(100).optional().describe('Page size, up to 100'),
      offset: z.number().int().min(0).optional().describe('Number of participants to skip'),
      search: z.string().optional().describe('Search participants by name or email')
    })
  )
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
        .describe('List of workspace participants'),
      totalSize: z.number().optional().describe('Total matching participants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });

    let { participants, totalSize } = await client.listParticipants(
      ctx.input.orgId,
      ctx.input
    );

    return {
      output: {
        totalSize,
        participants: participants.map(p => ({
          participantId: p.participantId ?? undefined,
          userName: p.userName ?? undefined,
          email: p.email ?? undefined,
          firstName: p.firstName ?? undefined,
          lastName: p.lastName ?? undefined,
          role: p.role ?? undefined,
          teamName: p.teamName ?? undefined
        }))
      },
      message: `Found **${participants.length}** workspace participants.`
    };
  })
  .build();
