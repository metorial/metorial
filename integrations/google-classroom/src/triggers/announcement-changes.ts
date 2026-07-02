import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let announcementOutputSchema = z.object({
  announcementId: z.string().optional().describe('ID of the announcement'),
  courseId: z.string().optional().describe('Course ID'),
  text: z.string().optional().describe('Text content of the announcement'),
  state: z.string().optional().describe('State (PUBLISHED, DRAFT, DELETED)'),
  alternateLink: z.string().optional().describe('URL to the announcement'),
  creationTime: z.string().optional().describe('When the announcement was created'),
  updateTime: z.string().optional().describe('When the announcement was last updated'),
  creatorUserId: z.string().optional().describe('User ID of the creator')
});

export let announcementChanges = SlateTrigger.create(spec, {
  name: 'Announcement Changes',
  key: 'announcement_changes',
  description:
    'Triggers when announcements are created or updated in courses you teach. Detects new and modified announcements by polling the API.'
})
  .scopes(googleClassroomActionScopes.announcementChanges)
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the announcement was created or updated'),
      announcementId: z.string().describe('Announcement ID'),
      courseId: z.string().describe('Course ID'),
      announcement: z.any().describe('Full announcement data')
    })
  )
  .output(announcementOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ClassroomClient({ token: ctx.auth.token });

      let previousState = ctx.state || {};
      let knownAnnouncements: Record<string, string> = previousState.knownAnnouncements || {};

      let inputs: Array<{
        changeType: 'created' | 'updated';
        announcementId: string;
        courseId: string;
        announcement: any;
      }> = [];

      let coursesResult = await client.listCourses({ teacherId: 'me', pageSize: 100 });
      let courses = coursesResult.courses || [];

      let newKnownAnnouncements: Record<string, string> = {};

      for (let course of courses) {
        let cId = course.id;
        if (!cId) continue;

        let result = await client.listAnnouncements(cId, {
          pageSize: 50,
          orderBy: 'updateTime desc'
        });

        let announcements = result.announcements || [];

        for (let ann of announcements) {
          let annId = ann.id;
          if (!annId) continue;

          newKnownAnnouncements[annId] = ann.updateTime || '';

          if (previousState.initialized) {
            let prevUpdateTime = knownAnnouncements[annId];
            if (!prevUpdateTime) {
              inputs.push({
                changeType: 'created',
                announcementId: annId,
                courseId: cId,
                announcement: ann
              });
            } else if (prevUpdateTime !== (ann.updateTime || '')) {
              inputs.push({
                changeType: 'updated',
                announcementId: annId,
                courseId: cId,
                announcement: ann
              });
            }
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownAnnouncements: newKnownAnnouncements,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      let { changeType, announcementId, courseId, announcement } = ctx.input;

      return {
        type: `announcement.${changeType}`,
        id: `${announcementId}_${changeType}_${announcement.updateTime || Date.now()}`,
        output: {
          announcementId: announcement.id,
          courseId: announcement.courseId || courseId,
          text: announcement.text,
          state: announcement.state,
          alternateLink: announcement.alternateLink,
          creationTime: announcement.creationTime,
          updateTime: announcement.updateTime,
          creatorUserId: announcement.creatorUserId
        }
      };
    }
  })
  .build();
