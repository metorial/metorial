import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let announcementOutputSchema = z.object({
  announcementId: z.string().describe('Announcement ID'),
  title: z.string().describe('Announcement title'),
  body: z.string().describe('Announcement body (HTML)'),
  showAtLogin: z.boolean().optional().describe('Whether shown at login'),
  showInCourses: z.boolean().optional().describe('Whether shown in courses'),
  creator: z.string().optional().describe('Creator user ID'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp')
});

let mapAnnouncement = (a: any) => ({
  announcementId: a.id,
  title: a.title,
  body: a.body,
  showAtLogin: a.showAtLogin,
  showInCourses: a.showInCourses,
  creator: a.creator,
  created: a.created,
  modified: a.modified
});

export let createAnnouncement = SlateTool.create(spec, {
  name: 'Create Announcement',
  key: 'create_announcement',
  description: `Create an announcement in a course. Announcements are displayed to enrolled users and can be scheduled with start/end dates.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      title: z.string().describe('Announcement title'),
      body: z.string().describe('Announcement body (HTML supported)'),
      showAtLogin: z.boolean().optional().describe('Show at login'),
      showInCourses: z.boolean().optional().describe('Show in courses'),
      durationType: z
        .enum(['Permanent', 'DateRange', 'Term'])
        .optional()
        .describe('Availability duration type'),
      startDate: z.string().optional().describe('Start date (ISO 8601)'),
      endDate: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(announcementOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let announcement = await client.createCourseAnnouncement(ctx.input.courseId, {
      title: ctx.input.title,
      body: ctx.input.body,
      showAtLogin: ctx.input.showAtLogin,
      showInCourses: ctx.input.showInCourses,
      availability:
        ctx.input.durationType || ctx.input.startDate || ctx.input.endDate
          ? {
              duration: {
                type: ctx.input.durationType,
                start: ctx.input.startDate,
                end: ctx.input.endDate
              }
            }
          : undefined
    });

    return {
      output: mapAnnouncement(announcement),
      message: `Created announcement **${announcement.title}** in course **${ctx.input.courseId}**.`
    };
  })
  .build();

export let listAnnouncements = SlateTool.create(spec, {
  name: 'List Announcements',
  key: 'list_announcements',
  description: `List announcements for a course. Provide a courseId for course-level announcements, or omit it for system-level announcements.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z
        .string()
        .optional()
        .describe('Course identifier — omit for system announcements'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      announcements: z.array(announcementOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = ctx.input.courseId
      ? await client.listCourseAnnouncements(ctx.input.courseId, {
          offset: ctx.input.offset,
          limit: ctx.input.limit
        })
      : await client.listSystemAnnouncements({
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });

    let announcements = (result.results || []).map(mapAnnouncement);
    return {
      output: { announcements, hasMore: !!result.paging?.nextPage },
      message: `Found **${announcements.length}** announcement(s).`
    };
  })
  .build();

export let updateAnnouncement = SlateTool.create(spec, {
  name: 'Update Announcement',
  key: 'update_announcement',
  description: `Update an existing course announcement. Only provided fields will be changed.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      announcementId: z.string().describe('Announcement ID'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New body (HTML)'),
      showAtLogin: z.boolean().optional().describe('Show at login'),
      showInCourses: z.boolean().optional().describe('Show in courses')
    })
  )
  .output(announcementOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let announcement = await client.updateCourseAnnouncement(
      ctx.input.courseId,
      ctx.input.announcementId,
      {
        title: ctx.input.title,
        body: ctx.input.body,
        showAtLogin: ctx.input.showAtLogin,
        showInCourses: ctx.input.showInCourses
      }
    );

    return {
      output: mapAnnouncement(announcement),
      message: `Updated announcement **${announcement.title}**.`
    };
  })
  .build();

export let deleteAnnouncement = SlateTool.create(spec, {
  name: 'Delete Announcement',
  key: 'delete_announcement',
  description: `Delete a course announcement. This action cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      announcementId: z.string().describe('Announcement ID')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the announcement was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    await client.deleteCourseAnnouncement(ctx.input.courseId, ctx.input.announcementId);
    return {
      output: { deleted: true },
      message: `Deleted announcement **${ctx.input.announcementId}**.`
    };
  })
  .build();
