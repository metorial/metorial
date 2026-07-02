import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoCaptchaClient } from '../lib/client';
import { spec } from '../spec';

export let solveImageCaptcha = SlateTool.create(spec, {
  name: 'Solve Image Captcha',
  key: 'solve_image_captcha',
  description: `Submit an image-based captcha or text question for solving. Supports normal image captchas (distorted text) and text-based captcha questions.
Provide a base64-encoded image for image captchas, or a text question for text captchas.
The task is processed asynchronously — use **Get Task Result** to poll for the solution.`,
  instructions: [
    'For image captchas, provide the image as a base64-encoded string (without the data URI prefix).',
    'Use the comment field to provide instructions to the solver about what text to recognize.',
    'Set numeric to 1 for digits only, 2 for letters only, or leave unset for any characters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      captchaType: z
        .enum(['image', 'text'])
        .describe('Type of captcha: "image" for image-based or "text" for text question'),

      // Image captcha
      imageBody: z
        .string()
        .optional()
        .describe(
          'Base64-encoded image content (required for image type, without data URI prefix)'
        ),
      phrase: z
        .boolean()
        .optional()
        .describe('Set to true if the answer contains multiple words separated by spaces'),
      caseSensitive: z
        .boolean()
        .optional()
        .describe('Set to true if the answer is case-sensitive'),
      numeric: z
        .number()
        .optional()
        .describe(
          '0 = any characters (default), 1 = digits only, 2 = letters only, 3 = either digits or letters'
        ),
      math: z
        .boolean()
        .optional()
        .describe('Set to true if the image contains a math expression to solve'),
      minLength: z.number().optional().describe('Minimum length of the answer'),
      maxLength: z.number().optional().describe('Maximum length of the answer'),
      comment: z
        .string()
        .optional()
        .describe('Instructions for the solver about what to recognize in the image'),
      imgInstructions: z
        .string()
        .optional()
        .describe('Base64-encoded image with additional instructions for the solver'),

      // Text captcha
      textQuestion: z
        .string()
        .optional()
        .describe(
          'Text question to answer (required for text type, e.g. "What color is the sky?")'
        ),

      languagePool: z
        .enum(['en', 'rn'])
        .optional()
        .describe('Language pool for workers: "en" (English) or "rn" (Russian)'),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL where the solution will be sent via POST when ready')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task, use this to poll for results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoCaptchaClient({ token: ctx.auth.token });
    let task: Record<string, unknown>;

    if (ctx.input.captchaType === 'image') {
      if (!ctx.input.imageBody) {
        throw new Error('imageBody is required for image captcha type');
      }
      task = client.buildImageToTextTask({
        body: ctx.input.imageBody,
        phrase: ctx.input.phrase,
        caseSensitive: ctx.input.caseSensitive,
        numeric: ctx.input.numeric,
        math: ctx.input.math,
        minLength: ctx.input.minLength,
        maxLength: ctx.input.maxLength,
        comment: ctx.input.comment,
        imgInstructions: ctx.input.imgInstructions
      });
    } else {
      if (!ctx.input.textQuestion) {
        throw new Error('textQuestion is required for text captcha type');
      }
      task = client.buildTextCaptchaTask({
        comment: ctx.input.textQuestion
      });
    }

    let result = await client.createTask(task, {
      callbackUrl: ctx.input.callbackUrl,
      languagePool: ctx.input.languagePool
    });

    if (result.errorId !== 0) {
      throw new Error(`2Captcha error: ${result.errorCode} - ${result.errorDescription}`);
    }

    return {
      output: {
        taskId: result.taskId!
      },
      message: `**${ctx.input.captchaType}** captcha task created with ID **${result.taskId}**. Poll using Get Task Result to retrieve the solution.`
    };
  })
  .build();
