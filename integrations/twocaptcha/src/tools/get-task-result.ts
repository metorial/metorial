import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoCaptchaClient } from '../lib/client';
import { spec } from '../spec';

export let getTaskResult = SlateTool.create(spec, {
  name: 'Get Task Result',
  key: 'get_task_result',
  description: `Poll for the result of a previously submitted captcha task. Returns the current status and solution when available.
If the task is still being processed, the status will be "processing". When complete, the status will be "ready" and the solution object will contain the answer.`,
  instructions: [
    'Typically takes 5-30 seconds for most captcha types. Poll every 5 seconds.',
    'The solution format varies by captcha type (e.g. gRecaptchaResponse for reCAPTCHA, token for hCaptcha/Turnstile).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.number().describe('Task ID returned from a solve captcha request')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Task status: "processing" if still in progress, "ready" if solved'),
      solution: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Solution object containing the answer (format depends on captcha type). Common keys: gRecaptchaResponse, text, token, challenge, validate, seccode'
        ),
      cost: z.string().optional().describe('Cost of solving this captcha in USD'),
      solveTime: z
        .number()
        .optional()
        .describe('Time taken to solve in seconds (endTime - createTime)'),
      workerIp: z
        .string()
        .optional()
        .describe('IP address of the worker who solved the captcha')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoCaptchaClient({ token: ctx.auth.token });
    let result = await client.getTaskResult(ctx.input.taskId);

    if (result.errorId !== 0) {
      throw new Error(`2Captcha error: ${result.errorCode} - ${result.errorDescription}`);
    }

    let solveTime: number | undefined;
    if (result.createTime && result.endTime) {
      solveTime = result.endTime - result.createTime;
    }

    let status = result.status ?? 'processing';

    return {
      output: {
        status,
        solution: result.solution,
        cost: result.cost,
        solveTime,
        workerIp: result.ip
      },
      message:
        status === 'ready'
          ? `Task **${ctx.input.taskId}** solved successfully. Cost: **$${result.cost ?? 'N/A'}**.`
          : `Task **${ctx.input.taskId}** is still **processing**. Try again in a few seconds.`
    };
  })
  .build();
