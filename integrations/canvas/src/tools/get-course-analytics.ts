import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let getCourseAnalyticsTool = SlateTool.create(spec, {
  name: 'Get Course Analytics',
  key: 'get_course_analytics',
  description: `Retrieve course-level analytics data. Choose between activity data (page views and participation over time), assignment statistics (min/max/median scores), or student summaries (per-student page views and participation).`,
  constraints: ['Requires "View analytics" permission in the course.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      analyticsType: z
        .enum(['activity', 'assignments', 'student_summaries'])
        .describe(
          'Type of analytics: activity (page views/participation over time), assignments (score statistics), or student_summaries (per-student data)'
        )
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Course ID'),
      analyticsType: z.string().describe('Type of analytics returned'),
      analyticsData: z.any().describe('Analytics data (format varies by type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let data = await client.getCourseAnalytics(ctx.input.courseId, ctx.input.analyticsType);

    let summary = '';
    if (ctx.input.analyticsType === 'student_summaries' && Array.isArray(data)) {
      summary = `Retrieved student summaries for **${data.length}** student(s).`;
    } else if (ctx.input.analyticsType === 'assignments' && Array.isArray(data)) {
      summary = `Retrieved statistics for **${data.length}** assignment(s).`;
    } else {
      summary = `Retrieved **${ctx.input.analyticsType}** analytics for course ${ctx.input.courseId}.`;
    }

    return {
      output: {
        courseId: ctx.input.courseId,
        analyticsType: ctx.input.analyticsType,
        analyticsData: data
      },
      message: summary
    };
  })
  .build();
