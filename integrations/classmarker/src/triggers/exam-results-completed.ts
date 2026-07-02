import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let webhookQuestionSchema = z.object({
  questionId: z.number().describe('Unique identifier of the question'),
  questionType: z.string().describe('Type of question'),
  categoryId: z.number().optional().describe('Category the question belongs to'),
  pointsAvailable: z.number().optional().describe('Points available for this question'),
  question: z.string().describe('The question text'),
  options: z.any().optional().describe('Answer options'),
  correctOption: z
    .string()
    .optional()
    .describe('The correct option key (for single-answer questions)'),
  correctOptions: z
    .array(z.string())
    .optional()
    .describe('Correct option keys (for multi-answer questions)'),
  pointsScored: z.number().optional().describe('Points scored by the user'),
  userResponse: z.any().optional().describe("The user's response"),
  result: z
    .string()
    .optional()
    .describe(
      'Result status (correct, incorrect, partial_correct, requires_grading, unanswered)'
    ),
  feedback: z.string().optional().describe('Feedback shown to the user')
});

let categoryResultSchema = z.object({
  categoryId: z.number().describe('Category ID'),
  name: z.string().describe('Category name'),
  percentage: z.number().describe('Score percentage for this category'),
  pointsAvailable: z.number().describe('Total points available in this category'),
  pointsScored: z.number().describe('Points scored in this category')
});

export let examResultsCompleted = SlateTrigger.create(spec, {
  name: 'Exam Results Completed',
  key: 'exam_results_completed',
  description:
    'Triggers when an exam is completed. Delivers real-time results including user details, scores, individual question responses, and category-level breakdowns. Supports both group and link-based exams.'
})
  .input(
    z.object({
      payloadType: z.string().describe('Type of payload (group or link results)'),
      payloadStatus: z
        .string()
        .describe('Whether this is a live result or a verification test'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      payloadType: z
        .enum(['group', 'link'])
        .describe('Whether this result is from a group or link exam'),
      payloadStatus: z
        .enum(['live', 'verify'])
        .describe('Whether this is a live result or verification test'),
      testId: z.number().describe('ID of the test'),
      testName: z.string().describe('Name of the test'),
      groupId: z.number().optional().describe('ID of the group (for group results)'),
      groupName: z.string().optional().describe('Name of the group (for group results)'),
      linkId: z.number().optional().describe('ID of the link (for link results)'),
      linkName: z.string().optional().describe('Name of the link (for link results)'),
      linkUrlId: z
        .string()
        .optional()
        .describe('URL identifier of the link (for link results)'),
      linkResultId: z.number().optional().describe('Unique result ID (for link results)'),
      userId: z.string().optional().describe('User ID of the exam taker'),
      firstName: z.string().optional().describe('First name of the exam taker'),
      lastName: z.string().optional().describe('Last name of the exam taker'),
      email: z.string().optional().describe('Email of the exam taker'),
      percentage: z.number().describe('Score percentage'),
      pointsScored: z.number().describe('Points scored'),
      pointsAvailable: z.number().describe('Total points available'),
      requiresGrading: z
        .string()
        .optional()
        .describe('Whether the result requires manual grading'),
      timeStarted: z.number().describe('Unix timestamp when the test was started'),
      timeFinished: z.number().describe('Unix timestamp when the test was finished'),
      duration: z.string().describe('Duration of the test in HH:MM:SS format'),
      percentagePassmark: z.number().optional().describe('Passmark percentage'),
      passed: z.boolean().optional().describe('Whether the exam taker passed'),
      cmUserId: z.string().optional().describe('Custom user ID passed via URL parameter'),
      accessCodeUsed: z.string().optional().describe('Access code used (for link results)'),
      certificateUrl: z.string().optional().describe('URL to the certificate PDF'),
      viewResultsUrl: z.string().optional().describe('URL to view formatted results'),
      questions: z.array(webhookQuestionSchema).describe('Individual question responses'),
      categoryResults: z
        .array(categoryResultSchema)
        .describe('Category-level score breakdowns')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = await ctx.request.text();
      let data = JSON.parse(body);

      return {
        inputs: [
          {
            payloadType: data.payload_type || 'unknown',
            payloadStatus: data.payload_status || 'live',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.rawPayload;
      let result = data.result || {};
      let test = data.test || {};
      let group = data.group;
      let link = data.link;
      let isGroup = ctx.input.payloadType === 'single_user_test_results_group';
      let payloadType: 'group' | 'link' = isGroup ? 'group' : 'link';

      let questions = (data.questions || []).map((q: any) => ({
        questionId: q.question_id,
        questionType: q.question_type,
        categoryId: q.category_id,
        pointsAvailable: q.points_available,
        question: q.question,
        options: q.options,
        correctOption: q.correct_option,
        correctOptions: q.correct_options,
        pointsScored: q.points_scored,
        userResponse: q.user_response,
        result: q.result,
        feedback: q.feedback
      }));

      let categoryResults = (data.category_results || []).map((c: any) => ({
        categoryId: c.category_id,
        name: c.name,
        percentage: c.percentage,
        pointsAvailable: c.points_available,
        pointsScored: c.points_scored
      }));

      // Build a unique event ID for deduplication
      let eventId = isGroup
        ? `${result.user_id || ''}_${test.test_id || ''}_${group?.group_id || ''}_${result.time_started || ''}`
        : `${result.link_result_id || `${result.email || ''}_${test.test_id || ''}_${result.time_started || ''}`}`;

      return {
        type: `exam_result.completed`,
        id: eventId,
        output: {
          payloadType,
          payloadStatus:
            ctx.input.payloadStatus === 'verify' ? ('verify' as const) : ('live' as const),
          testId: test.test_id,
          testName: test.test_name,
          groupId: group?.group_id,
          groupName: group?.group_name,
          linkId: link?.link_id,
          linkName: link?.link_name,
          linkUrlId: link?.link_url_id,
          linkResultId: result.link_result_id,
          userId: result.user_id,
          firstName: result.first,
          lastName: result.last,
          email: result.email,
          percentage: result.percentage,
          pointsScored: result.points_scored,
          pointsAvailable: result.points_available,
          requiresGrading: result.requires_grading,
          timeStarted: result.time_started,
          timeFinished: result.time_finished,
          duration: result.duration,
          percentagePassmark: result.percentage_passmark,
          passed: result.passed,
          cmUserId: result.cm_user_id,
          accessCodeUsed: result.access_code_used,
          certificateUrl: result.certificate_url,
          viewResultsUrl: result.view_results_url,
          questions,
          categoryResults
        }
      };
    }
  })
  .build();
