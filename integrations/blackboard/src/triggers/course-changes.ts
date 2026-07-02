import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let courseChanges = SlateTrigger.create(spec, {
  name: 'Course Changes',
  key: 'course_changes',
  description: 'Detects new or updated courses by polling the Blackboard courses API.'
})
  .input(
    z.object({
      courseId: z.string().describe('Internal course ID'),
      courseCode: z.string().describe('Course identifier code'),
      name: z.string().describe('Course name'),
      organization: z.boolean().describe('Whether this is an organization'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modified timestamp'),
      isNew: z.boolean().describe('Whether this is a newly detected course')
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Internal course ID'),
      courseCode: z.string().describe('Course identifier code'),
      name: z.string().describe('Course name'),
      organization: z.boolean().describe('Whether this is an organization'),
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
      let knownIds = (ctx.state?.knownIds as string[]) || [];

      let options: { limit?: number; modified?: string; modifiedCompare?: string } = {
        limit: 200
      };
      if (lastPolled) {
        options.modified = lastPolled;
        options.modifiedCompare = 'greaterOrEqual';
      }

      let result = await client.listCourses(options);
      let courses = result.results || [];
      let knownSet = new Set(knownIds);

      let inputs = courses.map(c => ({
        courseId: c.id,
        courseCode: c.courseId,
        name: c.name,
        organization: c.organization,
        created: c.created,
        modified: c.modified,
        isNew: !knownSet.has(c.id)
      }));

      let updatedKnownIds = [...new Set([...knownIds, ...courses.map(c => c.id)])];

      return {
        inputs,
        updatedState: {
          lastPolled: new Date().toISOString(),
          knownIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'created' : 'updated';

      return {
        type: `course.${eventType}`,
        id: `${ctx.input.courseId}-${ctx.input.modified || ctx.input.created || Date.now()}`,
        output: {
          courseId: ctx.input.courseId,
          courseCode: ctx.input.courseCode,
          name: ctx.input.name,
          organization: ctx.input.organization,
          created: ctx.input.created,
          modified: ctx.input.modified
        }
      };
    }
  })
  .build();
