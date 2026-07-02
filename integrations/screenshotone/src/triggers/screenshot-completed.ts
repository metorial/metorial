import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let screenshotCompleted = SlateTrigger.create(spec, {
  name: 'Screenshot Completed',
  key: 'screenshot_completed',
  description:
    'Triggered when an asynchronous screenshot, PDF, or rendering operation completes and the result is delivered via webhook.'
})
  .input(
    z.object({
      screenshotUrl: z.string().optional().describe('URL of the rendered screenshot'),
      storeLocation: z.string().optional().describe('S3 storage location if uploaded'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier set on the original request'),
      signature: z
        .string()
        .optional()
        .describe('Webhook signature from X-ScreenshotOne-Signature header'),
      errorMessage: z.string().optional().describe('Error details if the operation failed'),
      isError: z.boolean().describe('Whether this webhook delivery represents an error')
    })
  )
  .output(
    z.object({
      screenshotUrl: z.string().optional().describe('URL of the rendered screenshot or PDF'),
      storeLocation: z.string().optional().describe('S3 storage location if uploaded'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier for correlating with original request'),
      errorMessage: z.string().optional().describe('Error message if the operation failed'),
      isError: z.boolean().describe('Whether the operation resulted in an error')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let request = ctx.request;
      let signature = request.headers.get('x-screenshotone-signature') || undefined;

      let contentType = request.headers.get('content-type') || '';
      let isJson = contentType.includes('application/json');

      let screenshotUrl: string | undefined;
      let storeLocation: string | undefined;
      let externalId: string | undefined;
      let errorMessage: string | undefined;
      let isError = false;

      if (isJson) {
        let body = (await request.json()) as Record<string, unknown>;
        screenshotUrl = body.screenshot_url as string | undefined;
        storeLocation =
          ((body.store as Record<string, unknown>)?.location as string | undefined) ||
          (body.store_location as string | undefined);
        externalId = body.external_identifier as string | undefined;
        errorMessage =
          (body.error_message as string | undefined) || (body.error as string | undefined);
        isError = !!errorMessage;
      } else {
        // Binary response - the webhook delivered the screenshot directly
        // In this case we don't have structured data, just mark it as received
        screenshotUrl = undefined;
        externalId = request.headers.get('x-screenshotone-external-identifier') || undefined;
      }

      return {
        inputs: [
          {
            screenshotUrl,
            storeLocation,
            externalId,
            signature,
            errorMessage,
            isError
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isError ? 'screenshot.failed' : 'screenshot.completed';
      let eventId =
        ctx.input.externalId ||
        ctx.input.screenshotUrl ||
        ctx.input.storeLocation ||
        `webhook_${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          screenshotUrl: ctx.input.screenshotUrl,
          storeLocation: ctx.input.storeLocation,
          externalId: ctx.input.externalId,
          errorMessage: ctx.input.errorMessage,
          isError: ctx.input.isError
        }
      };
    }
  })
  .build();
