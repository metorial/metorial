import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let announcementSchema = z.object({
  announcementId: z.string().optional().describe('ID of the announcement'),
  courseId: z.string().optional().describe('Course ID'),
  text: z.string().optional().describe('Text content of the announcement'),
  state: z.string().optional().describe('State (PUBLISHED, DRAFT, DELETED)'),
  alternateLink: z.string().optional().describe('URL to the announcement'),
  creationTime: z.string().optional().describe('When the announcement was created'),
  updateTime: z.string().optional().describe('When the announcement was last updated'),
  creatorUserId: z.string().optional().describe('User ID of the creator'),
  scheduledTime: z.string().optional().describe('Scheduled publication time'),
  assigneeMode: z.string().optional().describe('Assignee mode')
});

export let manageAnnouncements = SlateTool.create(spec, {
  name: 'Manage Announcements',
  key: 'manage_announcements',
  description: `Create, list, update, or delete announcements in a Google Classroom course. Announcements appear at the top of the Stream page and can include materials and be targeted to specific students.`,
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageAnnouncements)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform'),
      announcementId: z
        .string()
        .optional()
        .describe('Announcement ID (required for get, update, delete)'),
      text: z
        .string()
        .optional()
        .describe('Text content of the announcement (for create/update)'),
      state: z
        .enum(['PUBLISHED', 'DRAFT'])
        .optional()
        .describe('State of the announcement (for create/update)'),
      materials: z
        .array(
          z.object({
            link: z
              .object({
                url: z.string().describe('URL of the link'),
                title: z.string().optional().describe('Title for the link')
              })
              .optional(),
            driveFile: z
              .object({
                driveFile: z.object({
                  driveId: z.string().describe('Drive file ID')
                }),
                shareMode: z.enum(['STUDENT_COPY', 'VIEW', 'EDIT']).optional()
              })
              .optional(),
            youtubeVideo: z
              .object({
                id: z.string().describe('YouTube video ID')
              })
              .optional()
          })
        )
        .optional()
        .describe('Materials to attach (for create/update)'),
      assigneeMode: z
        .enum(['ALL_STUDENTS', 'INDIVIDUAL_STUDENTS'])
        .optional()
        .describe('Whether to target all students or specific students'),
      individualStudentIds: z
        .array(z.string())
        .optional()
        .describe('Student IDs to target (when assigneeMode is INDIVIDUAL_STUDENTS)'),
      announcementStates: z
        .array(z.enum(['PUBLISHED', 'DRAFT', 'DELETED']))
        .optional()
        .describe('Filter by states (for list)'),
      pageSize: z.number().optional().describe('Maximum results to return (for list)'),
      pageToken: z.string().optional().describe('Token for next page (for list)')
    })
  )
  .output(
    z.object({
      announcement: announcementSchema.optional().describe('The announcement'),
      announcements: z.array(announcementSchema).optional().describe('List of announcements'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { courseId, action, announcementId } = ctx.input;

    let mapAnnouncement = (a: any) => ({
      announcementId: a.id,
      courseId: a.courseId,
      text: a.text,
      state: a.state,
      alternateLink: a.alternateLink,
      creationTime: a.creationTime,
      updateTime: a.updateTime,
      creatorUserId: a.creatorUserId,
      scheduledTime: a.scheduledTime,
      assigneeMode: a.assigneeMode
    });

    if (action === 'list') {
      let result = await client.listAnnouncements(courseId, {
        announcementStates: ctx.input.announcementStates,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let announcements = (result.announcements || []).map(mapAnnouncement);
      return {
        output: { announcements, nextPageToken: result.nextPageToken, success: true },
        message: `Found **${announcements.length}** announcement(s).`
      };
    }

    if (action === 'get') {
      if (!announcementId) throw new Error('announcementId is required');
      let result = await client.getAnnouncement(courseId, announcementId);
      return {
        output: { announcement: mapAnnouncement(result), success: true },
        message: `Retrieved announcement \`${announcementId}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.text) throw new Error('text is required for creating an announcement');
      let body: Record<string, any> = { text: ctx.input.text };
      if (ctx.input.state) body.state = ctx.input.state;
      if (ctx.input.materials) body.materials = ctx.input.materials;
      if (ctx.input.assigneeMode) {
        body.assigneeMode = ctx.input.assigneeMode;
        if (
          ctx.input.assigneeMode === 'INDIVIDUAL_STUDENTS' &&
          ctx.input.individualStudentIds
        ) {
          body.individualStudentsOptions = { studentIds: ctx.input.individualStudentIds };
        }
      }
      let result = await client.createAnnouncement(courseId, body);
      return {
        output: { announcement: mapAnnouncement(result), success: true },
        message: `Created announcement (${result.state}).`
      };
    }

    if (action === 'update') {
      if (!announcementId) throw new Error('announcementId is required');
      let updateFields: Record<string, any> = {};
      let maskParts: string[] = [];
      if (ctx.input.text !== undefined) {
        updateFields.text = ctx.input.text;
        maskParts.push('text');
      }
      if (ctx.input.state !== undefined) {
        updateFields.state = ctx.input.state;
        maskParts.push('state');
      }
      if (ctx.input.materials !== undefined) {
        updateFields.materials = ctx.input.materials;
        maskParts.push('materials');
      }
      if (ctx.input.assigneeMode !== undefined) {
        updateFields.assigneeMode = ctx.input.assigneeMode;
        maskParts.push('assigneeMode');
        if (
          ctx.input.assigneeMode === 'INDIVIDUAL_STUDENTS' &&
          ctx.input.individualStudentIds
        ) {
          updateFields.individualStudentsOptions = {
            studentIds: ctx.input.individualStudentIds
          };
          maskParts.push('individualStudentsOptions.studentIds');
        }
      }
      let result = await client.updateAnnouncement(
        courseId,
        announcementId,
        updateFields,
        maskParts.join(',')
      );
      return {
        output: { announcement: mapAnnouncement(result), success: true },
        message: `Updated announcement \`${announcementId}\`.`
      };
    }

    if (action === 'delete') {
      if (!announcementId) throw new Error('announcementId is required');
      await client.deleteAnnouncement(courseId, announcementId);
      return {
        output: { success: true },
        message: `Deleted announcement \`${announcementId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
