import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let newAnnouncementsTrigger = SlateTrigger.create(spec, {
  name: 'New Announcements',
  key: 'new_announcements',
  description:
    'Detects new announcements posted in courses. Polls for recently posted announcements across enrolled courses.'
})
  .input(
    z.object({
      announcementId: z.string().describe('Announcement/discussion topic ID'),
      courseId: z.string().describe('Course ID'),
      title: z.string().describe('Announcement title'),
      message: z.string().optional().nullable().describe('Announcement body HTML'),
      postedAt: z.string().optional().nullable().describe('Posted timestamp'),
      authorName: z.string().optional().nullable().describe('Author name')
    })
  )
  .output(
    z.object({
      announcementId: z.string().describe('Announcement ID'),
      courseId: z.string().describe('Course ID'),
      courseName: z.string().optional().describe('Course name'),
      title: z.string().describe('Announcement title'),
      message: z.string().optional().nullable().describe('Announcement body HTML'),
      postedAt: z.string().optional().nullable().describe('Posted timestamp'),
      authorName: z.string().optional().nullable().describe('Author name'),
      authorId: z.string().optional().describe('Author user ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CanvasClient({
        token: ctx.auth.token,
        canvasDomain: ctx.auth.canvasDomain
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownAnnouncementIds = (ctx.state?.knownAnnouncementIds || []) as string[];

      let courses = await client.listCourses({
        enrollmentState: 'active'
      });

      let contextCodes = courses.slice(0, 20).map((c: any) => `course_${c.id}`);

      if (contextCodes.length === 0) {
        return {
          inputs: [],
          updatedState: {
            lastPollTime: new Date().toISOString(),
            knownAnnouncementIds
          }
        };
      }

      let announcements = await client.listAnnouncements(contextCodes, {
        startDate: lastPollTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        activeOnly: true
      });

      let inputs: Array<{
        announcementId: string;
        courseId: string;
        title: string;
        message?: string | null;
        postedAt?: string | null;
        authorName?: string | null;
      }> = [];

      let newKnownIds = [...knownAnnouncementIds];

      for (let ann of announcements) {
        let annId = String(ann.id);
        if (knownAnnouncementIds.includes(annId)) continue;

        newKnownIds.push(annId);

        if (!lastPollTime) continue;

        inputs.push({
          announcementId: annId,
          courseId: ann.context_code?.replace('course_', '') || '',
          title: ann.title,
          message: ann.message,
          postedAt: ann.posted_at,
          authorName: ann.author?.display_name
        });
      }

      // Keep only the last 500 known IDs to prevent unbounded growth
      if (newKnownIds.length > 500) {
        newKnownIds = newKnownIds.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownAnnouncementIds: newKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'announcement.created',
        id: `announcement-${ctx.input.announcementId}`,
        output: {
          announcementId: ctx.input.announcementId,
          courseId: ctx.input.courseId,
          title: ctx.input.title,
          message: ctx.input.message,
          postedAt: ctx.input.postedAt,
          authorName: ctx.input.authorName
        }
      };
    }
  })
  .build();
