import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrollmentChanges = SlateTrigger.create(spec, {
  name: 'Enrollment Changes',
  key: 'enrollment_changes',
  description:
    'Detects new or updated enrollments in a specific course by polling the memberships API.'
})
  .input(
    z.object({
      userId: z.string().describe('User ID'),
      courseId: z.string().describe('Course ID'),
      courseRoleId: z.string().optional().describe('Course role'),
      available: z.string().optional().describe('Availability status'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modified timestamp'),
      isNew: z.boolean().describe('Whether this is a newly detected enrollment')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      courseId: z.string().describe('Course ID'),
      courseRoleId: z.string().optional().describe('Course role'),
      available: z.string().optional().describe('Availability status'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      let knownKeys = (ctx.state?.knownKeys as string[]) || [];

      // Poll all courses to find enrollment changes
      let coursesResult = await client.listCourses({ limit: 50 });
      let allInputs: any[] = [];
      let knownSet = new Set(knownKeys);
      let newKnownKeys = [...knownKeys];

      for (let course of (coursesResult.results || []).slice(0, 10)) {
        let options: { limit?: number; modified?: string; modifiedCompare?: string } = {
          limit: 200
        };
        if (lastPolled) {
          options.modified = lastPolled;
          options.modifiedCompare = 'greaterOrEqual';
        }

        try {
          let result = await client.listCourseMemberships(course.id, options);
          let memberships = result.results || [];

          for (let m of memberships) {
            let key = `${m.courseId}-${m.userId}`;
            let isNew = !knownSet.has(key);

            allInputs.push({
              userId: m.userId,
              courseId: m.courseId,
              courseRoleId: m.courseRoleId,
              available: m.availability?.available,
              created: m.created,
              modified: m.modified,
              isNew
            });

            if (isNew) {
              newKnownKeys.push(key);
              knownSet.add(key);
            }
          }
        } catch {
          // Skip courses we can't access
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPolled: new Date().toISOString(),
          knownKeys: newKnownKeys
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'created' : 'updated';

      return {
        type: `enrollment.${eventType}`,
        id: `${ctx.input.courseId}-${ctx.input.userId}-${ctx.input.modified || ctx.input.created || Date.now()}`,
        output: {
          userId: ctx.input.userId,
          courseId: ctx.input.courseId,
          courseRoleId: ctx.input.courseRoleId,
          available: ctx.input.available,
          created: ctx.input.created,
          modified: ctx.input.modified
        }
      };
    }
  })
  .build();
