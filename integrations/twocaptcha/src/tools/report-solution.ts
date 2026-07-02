import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoCaptchaClient } from '../lib/client';
import { spec } from '../spec';

export let reportSolution = SlateTool.create(spec, {
  name: 'Report Solution',
  key: 'report_solution',
  description: `Report a captcha solution as correct or incorrect. Reporting incorrect solutions helps improve quality and may result in a refund for the incorrectly solved captcha.`,
  instructions: [
    'Only report a solution after you have verified whether it worked or not.',
    'Reporting incorrect solutions within a reasonable timeframe may result in account credit.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('Task ID of the captcha solution to report'),
      isCorrect: z
        .boolean()
        .describe('Set to true to report as correct, false to report as incorrect')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Report submission status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoCaptchaClient({ token: ctx.auth.token });

    let result = ctx.input.isCorrect
      ? await client.reportCorrect(ctx.input.taskId)
      : await client.reportIncorrect(ctx.input.taskId);

    if (result.errorId !== 0) {
      throw new Error(`2Captcha error: ${result.errorCode} - ${result.errorDescription}`);
    }

    return {
      output: {
        status: result.status ?? 'ok'
      },
      message: `Solution for task **${ctx.input.taskId}** reported as **${ctx.input.isCorrect ? 'correct' : 'incorrect'}**.`
    };
  })
  .build();
