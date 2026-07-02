import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newQuestions = SlateTrigger.create(spec, {
  name: 'New Questions',
  key: 'new_questions',
  description:
    'Triggers when new questions are posted on a Stack Exchange site. Optionally filter by tags.'
})
  .input(
    z.object({
      questionId: z.number().describe('ID of the question'),
      title: z.string().describe('Title of the question'),
      link: z.string().describe('URL to the question'),
      score: z.number().describe('Net vote score'),
      answerCount: z.number().describe('Number of answers'),
      viewCount: z.number().describe('Number of views'),
      isAnswered: z.boolean().describe('Whether the question has been answered'),
      tags: z.array(z.string()).describe('Tags on the question'),
      creationDate: z.string().describe('When the question was created (ISO 8601)'),
      ownerDisplayName: z.string().optional().describe('Display name of the author'),
      ownerUserId: z.number().optional().describe('User ID of the author'),
      body: z.string().optional().describe('HTML body of the question')
    })
  )
  .output(
    z.object({
      questionId: z.number().describe('ID of the question'),
      title: z.string().describe('Title of the question'),
      link: z.string().describe('URL to the question'),
      score: z.number().describe('Net vote score'),
      answerCount: z.number().describe('Number of answers'),
      viewCount: z.number().describe('Number of views'),
      isAnswered: z.boolean().describe('Whether the question has been answered'),
      tags: z.array(z.string()).describe('Tags on the question'),
      creationDate: z.string().describe('When the question was created (ISO 8601)'),
      ownerDisplayName: z.string().optional().describe('Display name of the author'),
      ownerUserId: z.number().optional().describe('User ID of the author'),
      body: z.string().optional().describe('HTML body of the question')
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

      let result = await client.getQuestions({
        sort: 'creation',
        order: 'desc',
        fromDate: fromDate,
        pageSize: 50
      });

      let now = new Date().toISOString();

      let inputs = result.items.map((q: any) => ({
        questionId: q.question_id,
        title: q.title,
        link: q.link,
        score: q.score,
        answerCount: q.answer_count,
        viewCount: q.view_count,
        isAnswered: q.is_answered,
        tags: q.tags ?? [],
        creationDate: new Date(q.creation_date * 1000).toISOString(),
        ownerDisplayName: q.owner?.display_name,
        ownerUserId: q.owner?.user_id,
        body: q.body
      }));

      return {
        inputs,
        updatedState: {
          lastPollDate: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'question.created',
        id: String(ctx.input.questionId),
        output: {
          questionId: ctx.input.questionId,
          title: ctx.input.title,
          link: ctx.input.link,
          score: ctx.input.score,
          answerCount: ctx.input.answerCount,
          viewCount: ctx.input.viewCount,
          isAnswered: ctx.input.isAnswered,
          tags: ctx.input.tags,
          creationDate: ctx.input.creationDate,
          ownerDisplayName: ctx.input.ownerDisplayName,
          ownerUserId: ctx.input.ownerUserId,
          body: ctx.input.body
        }
      };
    }
  })
  .build();
