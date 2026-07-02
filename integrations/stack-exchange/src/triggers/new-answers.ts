import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newAnswers = SlateTrigger.create(spec, {
  name: 'New Answers',
  key: 'new_answers',
  description:
    'Triggers when new answers are posted on a Stack Exchange site. Polls for recently created answers.'
})
  .input(
    z.object({
      answerId: z.number().describe('ID of the answer'),
      questionId: z.number().describe('ID of the parent question'),
      score: z.number().describe('Net vote score'),
      isAccepted: z.boolean().describe('Whether this is the accepted answer'),
      body: z.string().optional().describe('HTML body of the answer'),
      creationDate: z.string().describe('When the answer was posted (ISO 8601)'),
      ownerDisplayName: z.string().optional().describe('Display name of the author'),
      ownerUserId: z.number().optional().describe('User ID of the author'),
      link: z.string().optional().describe('URL to the answer')
    })
  )
  .output(
    z.object({
      answerId: z.number().describe('ID of the answer'),
      questionId: z.number().describe('ID of the parent question'),
      score: z.number().describe('Net vote score'),
      isAccepted: z.boolean().describe('Whether this is the accepted answer'),
      body: z.string().optional().describe('HTML body of the answer'),
      creationDate: z.string().describe('When the answer was posted (ISO 8601)'),
      ownerDisplayName: z.string().optional().describe('Display name of the author'),
      ownerUserId: z.number().optional().describe('User ID of the author'),
      link: z.string().optional().describe('URL to the answer')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        key: ctx.auth.key,
        site: ctx.config.site
      });

      let lastPollDate = ctx.state?.lastPollDate as string | undefined;
      let fromDate = lastPollDate || new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);

      let result = await client.getQuestions({
        sort: 'activity',
        order: 'desc',
        fromDate: fromDate,
        pageSize: 50,
        filter: '!nNPvSNe7ya'
      });

      let now = new Date().toISOString();

      // Collect answers from recently active questions
      let allAnswerInputs: any[] = [];

      for (let q of result.items) {
        if (q.answer_count > 0) {
          let answersResult = await client.getQuestionAnswers(String(q.question_id), {
            sort: 'creation',
            order: 'desc',
            pageSize: 10
          });

          for (let a of answersResult.items) {
            if (a.creation_date >= fromTimestamp) {
              allAnswerInputs.push({
                answerId: a.answer_id,
                questionId: a.question_id,
                score: a.score,
                isAccepted: a.is_accepted ?? false,
                body: a.body,
                creationDate: new Date(a.creation_date * 1000).toISOString(),
                ownerDisplayName: a.owner?.display_name,
                ownerUserId: a.owner?.user_id,
                link: a.link
              });
            }
          }
        }
      }

      return {
        inputs: allAnswerInputs,
        updatedState: {
          lastPollDate: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'answer.created',
        id: String(ctx.input.answerId),
        output: {
          answerId: ctx.input.answerId,
          questionId: ctx.input.questionId,
          score: ctx.input.score,
          isAccepted: ctx.input.isAccepted,
          body: ctx.input.body,
          creationDate: ctx.input.creationDate,
          ownerDisplayName: ctx.input.ownerDisplayName,
          ownerUserId: ctx.input.ownerUserId,
          link: ctx.input.link
        }
      };
    }
  })
  .build();
