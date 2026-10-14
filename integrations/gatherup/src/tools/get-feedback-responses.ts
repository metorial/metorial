import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, readOptionalNumber } from '../lib/helpers';
import { spec } from '../spec';

export let getFeedbackResponses = SlateTool.create(spec, {
  name: 'Get Feedback Responses',
  key: 'get_feedback_responses',
  description:
    'Retrieve business-owner and customer replies to first-party feedback. Filter by business, feedback ID, or date range and follow pagination to read the conversation history.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      businessId: z
        .string()
        .optional()
        .describe('Business IDs, comma-separated. Call list_businesses to discover IDs.'),
      feedbackId: z
        .string()
        .optional()
        .describe('Feedback IDs, comma-separated. Call get_feedbacks to discover IDs.'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      responses: z.array(
        z.object({
          responseId: z.number().optional().describe('Response ID when provided'),
          businessId: z.number().optional().describe('Associated business ID'),
          feedbackId: z.number().optional().describe('Associated feedback ID'),
          type: z.string().optional().describe('Reply author type: owner or customer'),
          date: z.string().optional().describe('Reply timestamp'),
          content: z.string().optional().describe('Reply text')
        })
      ),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      totalCount: z.number().describe('Number of replies in this page')
    })
  )
  .handleInvocation(async ctx => {
    let data = await createClient(ctx).getFeedbackResponses(ctx.input);
    let count = readOptionalNumber(data.count) ?? 0;
    let responses = Array.from({ length: count }, (_, index) => {
      let n = index + 1;
      return {
        responseId: readOptionalNumber(data[`responseId${n}`]),
        businessId: readOptionalNumber(data[`businessId${n}`]),
        feedbackId: readOptionalNumber(data[`feedbackId${n}`]),
        type: data[`type${n}`] as string | undefined,
        date: data[`date${n}`] as string | undefined,
        content: data[`content${n}`] as string | undefined
      };
    });
    return {
      output: {
        responses,
        page: readOptionalNumber(data.page) ?? 1,
        pages: readOptionalNumber(data.pages) ?? 1,
        totalCount: count
      },
      message: `Found **${responses.length}** feedback response(s).`
    };
  })
  .build();
