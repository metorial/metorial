import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TwoCaptchaClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description:
    'Submit a documented 2Captcha API v2 task using its exact provider task object. Supports additional task types such as audio recognition, image coordinates, and reCAPTCHA V2 Enterprise. Returns a task ID immediately; use get_task_result to retrieve the solution.',
  instructions: [
    'Use the exact type and fields from https://2captcha.com/api-docs. For example, RecaptchaV3TaskProxyless requires websiteURL, websiteKey, and minScore (0.3, 0.7, or 0.9). reCAPTCHA V3 does not support proxies.',
    'Each submission can incur a charge. This tool submits once and does not retry or wait for completion. After a transport failure, check your callback or account before submitting again.',
    'Wait at least 5 seconds between get_task_result requests. Keep task-specific solution fields such as the Turnstile userAgent when applying a result.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      task: z
        .object({
          type: z
            .string()
            .min(1)
            .describe('Exact task type from the provider API v2 documentation')
        })
        .catchall(z.unknown())
        .describe(
          'Complete provider task object, including every field required for that task type'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe('Registered callback URL for receiving the result'),
      languagePool: z
        .enum(['en', 'ru'])
        .optional()
        .describe('Worker language pool for image or text tasks'),
      softId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('ID of software registered in the provider software catalog')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Actual provider task ID to pass to get_task_result'),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.task.type === 'RecaptchaV3Task') {
      throw createApiServiceError(
        'reCAPTCHA V3 does not support proxies. Use RecaptchaV3TaskProxyless without proxy fields.'
      );
    }
    if (
      ctx.input.task.type === 'RecaptchaV3TaskProxyless' &&
      ['proxyType', 'proxyAddress', 'proxyPort', 'proxyLogin', 'proxyPassword'].some(
        key => ctx.input.task[key] !== undefined
      )
    ) {
      throw createApiServiceError(
        'reCAPTCHA V3 does not support proxy fields. Remove them from RecaptchaV3TaskProxyless.'
      );
    }
    let client = new TwoCaptchaClient({ token: ctx.auth.token });
    let result = await client.createTask(ctx.input.task, {
      callbackUrl: ctx.input.callbackUrl,
      languagePool: ctx.input.languagePool,
      softId: ctx.input.softId
    });
    return {
      output: { taskId: result.taskId, raw: result },
      message: `Task **${result.taskId}** submitted. Use get_task_result after at least 5 seconds; submitting again creates a separate task.`
    };
  })
  .build();
