import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let captchaSolved = SlateTrigger.create(spec, {
  name: 'Captcha Solved',
  key: 'captcha_solved',
  description:
    'Triggered when a captcha solution is ready. 2Captcha sends an HTTP POST request with the captcha ID and solution to the registered callback URL.'
})
  .input(
    z.object({
      captchaId: z.string().describe('ID of the solved captcha task'),
      answer: z.string().describe('The captcha solution/answer')
    })
  )
  .output(
    z.object({
      captchaId: z.string().describe('ID of the solved captcha task'),
      answer: z.string().describe('The captcha solution/answer')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      // 2Captcha sends POST with URL-encoded form data: id=CAPTCHA_ID&code=CAPTCHA_ANSWER
      let text = await ctx.request.text();
      let params = new URLSearchParams(text);

      let captchaId = params.get('id') ?? '';
      let answer = params.get('code') ?? '';

      // Also check query parameters (2Captcha may use GET in some configurations)
      if (!captchaId || !answer) {
        let url = new URL(ctx.request.url);
        captchaId = captchaId || url.searchParams.get('id') || '';
        answer = answer || url.searchParams.get('code') || '';
      }

      if (!captchaId || !answer) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            captchaId,
            answer
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'captcha.solved',
        id: ctx.input.captchaId,
        output: {
          captchaId: ctx.input.captchaId,
          answer: ctx.input.answer
        }
      };
    }
  })
  .build();
