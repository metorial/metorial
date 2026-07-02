import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let invitationSchema = z.object({
  invitationId: z.string().optional().describe('ID of the invitation'),
  userId: z.string().optional().describe('User ID of the invitee'),
  courseId: z.string().optional().describe('Course ID'),
  role: z.string().optional().describe('Role the user is invited to (STUDENT or TEACHER)')
});

export let manageInvitations = SlateTool.create(spec, {
  name: 'Manage Invitations',
  key: 'manage_invitations',
  description: `Create, list, accept, or delete course invitations in Google Classroom. Invitations allow inviting users to join a course as a student or teacher.`,
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageInvitations)
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'accept', 'delete'])
        .describe('The invitation action to perform'),
      courseId: z.string().optional().describe('Course ID (required for list and create)'),
      userId: z
        .string()
        .optional()
        .describe('User ID or email (for filtering list or creating invitation)'),
      role: z
        .enum(['STUDENT', 'TEACHER'])
        .optional()
        .describe('Role for the invitation (required for create)'),
      invitationId: z
        .string()
        .optional()
        .describe('Invitation ID (required for accept and delete)'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of invitations to return (for list)'),
      pageToken: z.string().optional().describe('Token for next page (for list)')
    })
  )
  .output(
    z.object({
      invitation: invitationSchema.optional().describe('The created or retrieved invitation'),
      invitations: z.array(invitationSchema).optional().describe('List of invitations'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { action, courseId, userId, role, invitationId, pageSize, pageToken } = ctx.input;

    if (action === 'list') {
      let result = await client.listInvitations({ courseId, userId, pageSize, pageToken });
      let invitations = result.invitations || [];
      return {
        output: { invitations, nextPageToken: result.nextPageToken, success: true },
        message: `Found **${invitations.length}** invitation(s).`
      };
    }

    if (action === 'create') {
      if (!courseId) throw new Error('courseId is required for creating an invitation');
      if (!userId) throw new Error('userId is required for creating an invitation');
      if (!role) throw new Error('role is required for creating an invitation');
      let invitation = await client.createInvitation(courseId, userId, role);
      return {
        output: { invitation, success: true },
        message: `Created invitation for \`${userId}\` as **${role}** in course \`${courseId}\`.`
      };
    }

    if (action === 'accept') {
      if (!invitationId)
        throw new Error('invitationId is required for accepting an invitation');
      await client.acceptInvitation(invitationId);
      return {
        output: { success: true },
        message: `Accepted invitation \`${invitationId}\`.`
      };
    }

    if (action === 'delete') {
      if (!invitationId)
        throw new Error('invitationId is required for deleting an invitation');
      await client.deleteInvitation(invitationId);
      return {
        output: { success: true },
        message: `Deleted invitation \`${invitationId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
