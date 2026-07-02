import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let gradeChanges = SlateTrigger.create(spec, {
  name: 'Grade Changes',
  key: 'grade_changes',
  description:
    'Detects new or updated grades in a specific course by polling the gradebook API. Monitors all grade columns.'
})
  .input(
    z.object({
      userId: z.string().describe('User ID'),
      columnId: z.string().describe('Grade column ID'),
      courseId: z.string().describe('Course ID'),
      score: z.number().optional().describe('Numeric score'),
      text: z.string().optional().describe('Text grade'),
      status: z.string().optional().describe('Grade status'),
      modified: z.string().optional().describe('Last modified timestamp'),
      changeIndex: z.number().optional().describe('Change index for tracking modifications')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      columnId: z.string().describe('Grade column ID'),
      courseId: z.string().describe('Course ID'),
      score: z.number().optional().describe('Numeric score'),
      text: z.string().optional().describe('Text grade'),
      status: z.string().optional().describe('Grade status'),
      modified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

      let lastChangeIndices = (ctx.state?.lastChangeIndices as Record<string, number>) || {};

      // Get courses to monitor
      let coursesResult = await client.listCourses({ limit: 10 });
      let allInputs: any[] = [];
      let updatedIndices = { ...lastChangeIndices };

      for (let course of (coursesResult.results || []).slice(0, 5)) {
        try {
          let columnsResult = await client.listGradeColumns(course.id, { limit: 50 });

          for (let column of (columnsResult.results || []).slice(0, 10)) {
            try {
              let gradesResult = await client.listColumnGrades(course.id, column.id, {
                limit: 200
              });

              for (let grade of gradesResult.results || []) {
                let key = `${course.id}-${column.id}-${grade.userId}`;
                let lastIndex = lastChangeIndices[key] ?? -1;

                if (grade.changeIndex !== undefined && grade.changeIndex > lastIndex) {
                  allInputs.push({
                    userId: grade.userId,
                    columnId: grade.columnId,
                    courseId: course.id,
                    score: grade.score,
                    text: grade.text,
                    status: grade.status,
                    modified: grade.modified,
                    changeIndex: grade.changeIndex
                  });
                  updatedIndices[key] = grade.changeIndex;
                }
              }
            } catch {
              // Skip columns we can't access
            }
          }
        } catch {
          // Skip courses we can't access
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastChangeIndices: updatedIndices
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'grade.updated',
        id: `${ctx.input.courseId}-${ctx.input.columnId}-${ctx.input.userId}-${ctx.input.changeIndex ?? ctx.input.modified ?? Date.now()}`,
        output: {
          userId: ctx.input.userId,
          columnId: ctx.input.columnId,
          courseId: ctx.input.courseId,
          score: ctx.input.score,
          text: ctx.input.text,
          status: ctx.input.status,
          modified: ctx.input.modified
        }
      };
    }
  })
  .build();
