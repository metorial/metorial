import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let userProfileSchema = z
  .object({
    userId: z.string().optional().describe('User ID'),
    name: z
      .object({
        givenName: z.string().optional(),
        familyName: z.string().optional(),
        fullName: z.string().optional()
      })
      .optional()
      .describe('User name'),
    emailAddress: z.string().optional().describe('User email address'),
    photoUrl: z.string().optional().describe('User profile photo URL')
  })
  .optional();

let rosterMemberSchema = z.object({
  courseId: z.string().optional().describe('Course ID'),
  userId: z.string().optional().describe('User ID'),
  profile: userProfileSchema.describe('User profile information')
});

export let manageRoster = SlateTool.create(spec, {
  name: 'Manage Roster',
  key: 'manage_roster',
  description: `Add or remove teachers and students from a Google Classroom course. Supports adding users by email or user ID and removing them by user ID. Use action "add_teacher", "remove_teacher", "add_student", or "remove_student".`,
  instructions: [
    'Use "me" as the userId to refer to the authenticated user.',
    'When adding a student, you can optionally provide an enrollmentCode instead of the userId.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageRoster)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      action: z
        .enum(['add_teacher', 'remove_teacher', 'add_student', 'remove_student'])
        .describe('The roster action to perform'),
      userId: z
        .string()
        .optional()
        .describe(
          'User ID or email of the user to add/remove. Use "me" for the current user.'
        ),
      enrollmentCode: z
        .string()
        .optional()
        .describe('Enrollment code for adding a student (alternative to userId for students)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      member: rosterMemberSchema
        .optional()
        .describe('The added roster member (for add actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { courseId, action, userId, enrollmentCode } = ctx.input;

    if (action === 'add_teacher') {
      if (!userId) throw new Error('userId is required when adding a teacher');
      let result = await client.addTeacher(courseId, userId);
      return {
        output: { success: true, member: result },
        message: `Added teacher \`${userId}\` to course \`${courseId}\`.`
      };
    }

    if (action === 'remove_teacher') {
      if (!userId) throw new Error('userId is required when removing a teacher');
      await client.removeTeacher(courseId, userId);
      return {
        output: { success: true },
        message: `Removed teacher \`${userId}\` from course \`${courseId}\`.`
      };
    }

    if (action === 'add_student') {
      let result = await client.addStudent(courseId, enrollmentCode, userId);
      return {
        output: { success: true, member: result },
        message: `Added student${userId ? ` \`${userId}\`` : ''} to course \`${courseId}\`.`
      };
    }

    if (action === 'remove_student') {
      if (!userId) throw new Error('userId is required when removing a student');
      await client.removeStudent(courseId, userId);
      return {
        output: { success: true },
        message: `Removed student \`${userId}\` from course \`${courseId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
