import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let courseProgress = SlateTrigger.create(spec, {
  name: 'Course Progress Updated',
  key: 'course_progress',
  description:
    'Polls for new or updated learner tracking records across courses. Detects new completions and progress updates.'
})
  .input(
    z.object({
      trackingId: z.string().describe('Unique tracking record identifier'),
      courseId: z.string().describe('Course ID this tracking belongs to'),
      learnerIdentifier: z.string().describe('Learner identifier'),
      clientIdentifier: z.string().optional().describe('Client identifier'),
      completed: z.boolean().describe('Whether the course has been completed'),
      progress: z.number().optional().describe('Progress percentage'),
      isNewTracking: z.boolean().describe('Whether this is a newly detected tracking record'),
      raw: z.record(z.string(), z.any()).describe('Full tracking record from the API')
    })
  )
  .output(
    z.object({
      trackingId: z.string().describe('Unique tracking record identifier'),
      courseId: z.string().describe('Course ID'),
      learnerIdentifier: z.string().describe('Learner identifier'),
      clientIdentifier: z.string().optional().describe('Client identifier'),
      completed: z.boolean().describe('Whether the course has been completed'),
      progress: z.number().optional().describe('Progress percentage'),
      isNewTracking: z.boolean().describe('Whether this is a newly detected tracking record'),
      raw: z.record(z.string(), z.any()).describe('Full tracking record from the API')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        userId: ctx.auth.userId,
        authScheme: ctx.auth.authScheme
      });

      let knownTrackings: Record<string, boolean> =
        (ctx.state?.knownTrackings as Record<string, boolean>) ?? {};
      let knownCourseIds: string[] = (ctx.state?.courseIds as string[]) ?? [];

      // On first poll, fetch all courses to discover course IDs
      if (knownCourseIds.length === 0) {
        let coursesResult = await client.listCourses({ length: 100, page: 0 });
        let courses = Array.isArray(coursesResult)
          ? coursesResult
          : (coursesResult?.data ?? []);
        knownCourseIds = courses.map((c: any) => String(c.id));
      }

      let inputs: Array<{
        trackingId: string;
        courseId: string;
        learnerIdentifier: string;
        clientIdentifier?: string;
        completed: boolean;
        progress?: number;
        isNewTracking: boolean;
        raw: Record<string, any>;
      }> = [];

      let newKnownTrackings: Record<string, boolean> = { ...knownTrackings };

      for (let courseId of knownCourseIds) {
        try {
          let result = await client.listTrackings({
            id: Number(courseId),
            length: 100,
            page: 0
          });

          let trackings = Array.isArray(result) ? result : (result?.data ?? []);

          for (let tracking of trackings) {
            let tid = String(tracking.id ?? `${courseId}-${tracking.identifier}`);
            let wasCompleted = knownTrackings[tid] ?? false;
            let isCompleted = tracking.completed === true;
            let isNew = !(tid in knownTrackings);

            newKnownTrackings[tid] = isCompleted;

            if (isNew || (isCompleted && !wasCompleted)) {
              inputs.push({
                trackingId: tid,
                courseId: String(tracking.courseId ?? courseId),
                learnerIdentifier: tracking.identifier ?? '',
                clientIdentifier: tracking.clientIdentifier,
                completed: isCompleted,
                progress: tracking.progress,
                isNewTracking: isNew,
                raw: tracking
              });
            }
          }
        } catch {
          // Skip courses that fail (e.g., deleted)
        }
      }

      return {
        inputs,
        updatedState: {
          knownTrackings: newKnownTrackings,
          courseIds: knownCourseIds
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNewTracking ? 'tracking.created' : 'tracking.completed';

      return {
        type: eventType,
        id: `${ctx.input.trackingId}-${ctx.input.completed ? 'completed' : 'progress'}`,
        output: {
          trackingId: ctx.input.trackingId,
          courseId: ctx.input.courseId,
          learnerIdentifier: ctx.input.learnerIdentifier,
          clientIdentifier: ctx.input.clientIdentifier,
          completed: ctx.input.completed,
          progress: ctx.input.progress,
          isNewTracking: ctx.input.isNewTracking,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
