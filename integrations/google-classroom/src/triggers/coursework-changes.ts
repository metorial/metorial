import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let courseWorkOutputSchema = z.object({
  courseWorkId: z.string().optional().describe('ID of the coursework'),
  courseId: z.string().optional().describe('Course ID'),
  title: z.string().optional().describe('Title of the coursework'),
  description: z.string().optional().describe('Description'),
  state: z.string().optional().describe('State (PUBLISHED, DRAFT, DELETED)'),
  workType: z
    .string()
    .optional()
    .describe('Type (ASSIGNMENT, SHORT_ANSWER_QUESTION, MULTIPLE_CHOICE_QUESTION)'),
  maxPoints: z.number().optional().describe('Maximum points'),
  alternateLink: z.string().optional().describe('URL to the coursework'),
  creationTime: z.string().optional().describe('When the coursework was created'),
  updateTime: z.string().optional().describe('When the coursework was last updated')
});

export let courseworkChanges = SlateTrigger.create(spec, {
  name: 'Coursework Changes',
  key: 'coursework_changes',
  description:
    'Triggers when coursework (assignments, questions) is created or updated in courses you teach. Detects new and modified coursework items by polling the API.'
})
  .scopes(googleClassroomActionScopes.courseworkChanges)
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the coursework was created or updated'),
      courseWorkId: z.string().describe('Coursework ID'),
      courseId: z.string().describe('Course ID'),
      coursework: z.any().describe('Full coursework data')
    })
  )
  .output(courseWorkOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ClassroomClient({ token: ctx.auth.token });

      let previousState = ctx.state || {};
      let knownCoursework: Record<string, string> = previousState.knownCoursework || {};
      // knownCoursework maps courseWorkId -> updateTime

      let inputs: Array<{
        changeType: 'created' | 'updated';
        courseWorkId: string;
        courseId: string;
        coursework: any;
      }> = [];

      let coursesResult = await client.listCourses({ teacherId: 'me', pageSize: 100 });
      let courses = coursesResult.courses || [];

      let newKnownCoursework: Record<string, string> = {};

      for (let course of courses) {
        let cId = course.id;
        if (!cId) continue;

        let cwResult = await client.listCourseWork(cId, {
          pageSize: 50,
          orderBy: 'updateTime desc'
        });

        let courseWorkItems = cwResult.courseWork || [];

        for (let cw of courseWorkItems) {
          let cwId = cw.id;
          if (!cwId) continue;

          newKnownCoursework[cwId] = cw.updateTime || '';

          if (previousState.initialized) {
            let prevUpdateTime = knownCoursework[cwId];
            if (!prevUpdateTime) {
              inputs.push({
                changeType: 'created',
                courseWorkId: cwId,
                courseId: cId,
                coursework: cw
              });
            } else if (prevUpdateTime !== (cw.updateTime || '')) {
              inputs.push({
                changeType: 'updated',
                courseWorkId: cwId,
                courseId: cId,
                coursework: cw
              });
            }
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownCoursework: newKnownCoursework,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      let { changeType, courseWorkId, courseId, coursework } = ctx.input;

      return {
        type: `coursework.${changeType}`,
        id: `${courseWorkId}_${changeType}_${coursework.updateTime || Date.now()}`,
        output: {
          courseWorkId: coursework.id,
          courseId: coursework.courseId || courseId,
          title: coursework.title,
          description: coursework.description,
          state: coursework.state,
          workType: coursework.workType,
          maxPoints: coursework.maxPoints,
          alternateLink: coursework.alternateLink,
          creationTime: coursework.creationTime,
          updateTime: coursework.updateTime
        }
      };
    }
  })
  .build();
