import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let guardianSchema = z.object({
  guardianId: z.string().optional().describe('ID of the guardian relationship'),
  studentId: z.string().optional().describe('Student user ID'),
  invitedEmailAddress: z.string().optional().describe('Guardian email address'),
  guardianProfile: z
    .object({
      userId: z.string().optional(),
      name: z
        .object({
          givenName: z.string().optional(),
          familyName: z.string().optional(),
          fullName: z.string().optional()
        })
        .optional(),
      emailAddress: z.string().optional(),
      photoUrl: z.string().optional()
    })
    .optional()
    .describe('Guardian profile information')
});

let guardianInvitationSchema = z.object({
  invitationId: z.string().optional().describe('ID of the invitation'),
  studentId: z.string().optional().describe('Student user ID'),
  invitedEmailAddress: z.string().optional().describe('Guardian email address'),
  state: z.string().optional().describe('Invitation state (PENDING, COMPLETE)'),
  creationTime: z.string().optional().describe('When the invitation was created')
});

export let manageGuardians = SlateTool.create(spec, {
  name: 'Manage Guardians',
  key: 'manage_guardians',
  description: `List, invite, and remove guardians for students in Google Classroom. Guardians have access to student assignment information. Supports listing existing guardians, inviting new guardians, and managing invitations.`,
  instructions: [
    'Use action "list" to list guardians for a student.',
    'Use action "invite" to send a guardian invitation by email.',
    'Use action "list_invitations" to list pending guardian invitations.',
    'Use action "cancel_invitation" to cancel a pending invitation.',
    'Use action "remove" to remove an existing guardian.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageGuardians)
  .input(
    z.object({
      studentId: z
        .string()
        .describe('User ID or email of the student. Use "me" for the current user.'),
      action: z
        .enum(['list', 'invite', 'list_invitations', 'cancel_invitation', 'remove'])
        .describe('The guardian action to perform'),
      guardianId: z.string().optional().describe('Guardian ID (required for remove)'),
      invitedEmailAddress: z
        .string()
        .optional()
        .describe('Guardian email address (required for invite)'),
      invitationId: z
        .string()
        .optional()
        .describe('Invitation ID (required for cancel_invitation)'),
      pageSize: z.number().optional().describe('Maximum results to return (for list actions)'),
      pageToken: z.string().optional().describe('Token for next page (for list actions)')
    })
  )
  .output(
    z.object({
      guardians: z.array(guardianSchema).optional().describe('List of guardians'),
      guardian: guardianSchema.optional().describe('The guardian'),
      invitations: z
        .array(guardianInvitationSchema)
        .optional()
        .describe('List of guardian invitations'),
      invitation: guardianInvitationSchema.optional().describe('The guardian invitation'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { studentId, action } = ctx.input;

    if (action === 'list') {
      let result = await client.listGuardians(
        studentId,
        ctx.input.pageSize,
        ctx.input.pageToken
      );
      let guardians = result.guardians || [];
      return {
        output: { guardians, success: true, nextPageToken: result.nextPageToken },
        message: `Found **${guardians.length}** guardian(s) for student \`${studentId}\`.`
      };
    }

    if (action === 'invite') {
      if (!ctx.input.invitedEmailAddress) throw new Error('invitedEmailAddress is required');
      let result = await client.createGuardianInvitation(
        studentId,
        ctx.input.invitedEmailAddress
      );
      return {
        output: { invitation: result, success: true },
        message: `Sent guardian invitation to **${ctx.input.invitedEmailAddress}**.`
      };
    }

    if (action === 'list_invitations') {
      let result = await client.listGuardianInvitations(studentId, {
        invitedEmailAddress: ctx.input.invitedEmailAddress,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let invitations = result.guardianInvitations || [];
      return {
        output: { invitations, success: true, nextPageToken: result.nextPageToken },
        message: `Found **${invitations.length}** guardian invitation(s).`
      };
    }

    if (action === 'cancel_invitation') {
      if (!ctx.input.invitationId) throw new Error('invitationId is required');
      let result = await client.patchGuardianInvitation(
        studentId,
        ctx.input.invitationId,
        'COMPLETE'
      );
      return {
        output: { invitation: result, success: true },
        message: `Cancelled guardian invitation \`${ctx.input.invitationId}\`.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.guardianId) throw new Error('guardianId is required');
      await client.deleteGuardian(studentId, ctx.input.guardianId);
      return {
        output: { success: true },
        message: `Removed guardian \`${ctx.input.guardianId}\` from student \`${studentId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
