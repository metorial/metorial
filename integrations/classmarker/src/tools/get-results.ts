import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassMarkerClient } from '../lib/client';
import { spec } from '../spec';

let resultSchema = z.object({
  userId: z.string().optional().describe('User ID of the exam taker'),
  firstName: z.string().optional().describe('First name of the exam taker'),
  lastName: z.string().optional().describe('Last name of the exam taker'),
  email: z.string().optional().describe('Email of the exam taker'),
  testId: z.number().optional().describe('ID of the test taken'),
  groupId: z.number().optional().describe('ID of the group (for group results)'),
  linkId: z.number().optional().describe('ID of the link (for link results)'),
  linkResultId: z.number().optional().describe('Unique result ID (for link results)'),
  percentage: z.number().describe('Score percentage'),
  pointsScored: z.number().describe('Points scored'),
  pointsAvailable: z.number().describe('Total points available'),
  timeStarted: z.number().describe('Unix timestamp when the test was started'),
  timeFinished: z.number().describe('Unix timestamp when the test was finished'),
  duration: z.string().describe('Duration of the test in HH:MM:SS format'),
  percentagePassmark: z.number().optional().describe('Passmark percentage'),
  passed: z.boolean().optional().describe('Whether the exam taker passed'),
  requiresGrading: z
    .string()
    .optional()
    .describe('Whether the result requires manual grading'),
  status: z.string().optional().describe('Status of the result'),
  cmUserId: z.string().optional().describe('Custom user ID passed via URL parameter'),
  accessCode: z.string().optional().describe('Access code used (for link results)'),
  viewResultsUrl: z.string().optional().describe('URL to view formatted results'),
  certificateUrl: z.string().optional().describe('URL to the certificate PDF')
});

export let getExamResults = SlateTool.create(spec, {
  name: 'Get Exam Results',
  key: 'get_exam_results',
  description: `Retrieve exam/quiz results from ClassMarker. Can fetch results for all groups, all links, or a specific group/test or link/test combination. Results include user details, scores, timing, and grading status. Only results completed after the specified timestamp are returned.`,
  instructions: [
    'Provide a `finishedAfterTimestamp` to only retrieve results completed after that time. This must be less than 3 months old.',
    'Use `source` to choose between group or link results. Optionally specify `groupId`/`linkId` and `testId` to narrow results to a specific exam.'
  ],
  constraints: [
    'The `finishedAfterTimestamp` must be less than 3 months old.',
    'Maximum 200 results per request. Use `nextFinishedAfterTimestamp` from the response to paginate.',
    'Rate limit: 30 requests per hour per API key.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      source: z
        .enum(['groups', 'links'])
        .describe('Whether to retrieve group-based or link-based results'),
      groupId: z
        .number()
        .optional()
        .describe('Specific group ID to filter results (only for source=groups)'),
      linkId: z
        .number()
        .optional()
        .describe('Specific link ID to filter results (only for source=links)'),
      testId: z
        .number()
        .optional()
        .describe('Specific test ID to filter results (requires groupId or linkId)'),
      finishedAfterTimestamp: z
        .number()
        .describe('Unix timestamp - only return results completed after this time'),
      limit: z.number().optional().describe('Maximum number of results to return (max 200)')
    })
  )
  .output(
    z.object({
      results: z.array(resultSchema).describe('List of exam results'),
      numResultsAvailable: z.number().describe('Total number of results available'),
      numResultsReturned: z.number().describe('Number of results returned in this response'),
      moreResultsExist: z.boolean().describe('Whether more results are available'),
      nextFinishedAfterTimestamp: z
        .number()
        .optional()
        .describe('Timestamp to use for the next pagination request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassMarkerClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let { source, groupId, linkId, testId, finishedAfterTimestamp, limit } = ctx.input;
    let data: any;

    if (source === 'groups') {
      if (groupId && testId) {
        data = await client.getGroupTestResults(groupId, testId, {
          finishedAfterTimestamp,
          limit
        });
      } else {
        data = await client.getGroupRecentResults({ finishedAfterTimestamp, limit });
      }
    } else if (linkId && testId) {
      data = await client.getLinkTestResults(linkId, testId, {
        finishedAfterTimestamp,
        limit
      });
    } else {
      data = await client.getLinkRecentResults({ finishedAfterTimestamp, limit });
    }

    let rawResults = data.results || [];
    let results = rawResults.map((r: any) => ({
      userId: r.user_id,
      firstName: r.first,
      lastName: r.last,
      email: r.email,
      testId: r.test_id,
      groupId: r.group_id,
      linkId: r.link_id,
      linkResultId: r.link_result_id,
      percentage: r.percentage,
      pointsScored: r.points_scored,
      pointsAvailable: r.points_available,
      timeStarted: r.time_started,
      timeFinished: r.time_finished,
      duration: r.duration,
      percentagePassmark: r.percentage_passmark,
      passed: r.passed,
      requiresGrading: r.requires_grading,
      status: r.status,
      cmUserId: r.cm_user_id,
      accessCode: r.access_code,
      viewResultsUrl: r.view_results_url,
      certificateUrl: r.certificate_url
    }));

    return {
      output: {
        results,
        numResultsAvailable: data.num_results_available || 0,
        numResultsReturned: data.num_results_returned || results.length,
        moreResultsExist: data.more_results_exist || false,
        nextFinishedAfterTimestamp: data.next_finished_after_timestamp
      },
      message: `Retrieved **${results.length}** result(s) from ${source}. ${data.more_results_exist ? 'More results are available.' : 'No more results.'}`
    };
  })
  .build();
