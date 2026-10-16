import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, providerList, ReviewExpressClient } from '../lib/client';
import { spec } from '../spec';

export let manageReviewRequest = SlateTool.create(spec, {
  name: 'Manage Review Request',
  key: 'manage_review_request',
  description: `Modify or cancel an existing Review Express email request. Use this when a booking changes (dates updated, guest email changed) or when a booking is cancelled. Provide the Tripadvisor request ID returned from the Send Review Request tool.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      requestId: z.number().describe('Tripadvisor email request ID to modify or cancel'),
      action: z.enum(['modify', 'cancel']).describe('Whether to modify or cancel the request'),
      updates: z
        .object({
          locationId: z
            .string()
            .optional()
            .describe(
              'Updated mapped partner property ID expected by your Review Express account'
            ),
          partnerRequestId: z.string().optional().describe('Updated partner reference ID'),
          recipient: z.string().optional().describe('Updated guest email address'),
          checkin: z.string().optional().describe('Updated check-in date (YYYY-MM-DD)'),
          checkout: z.string().optional().describe('Updated check-out date (YYYY-MM-DD)'),
          language: z.string().optional().describe('Updated language code'),
          country: z.string().optional().describe('Updated ISO 3166-1 alpha-2 country code')
        })
        .optional()
        .describe('Fields to update (only for modify action)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      requestId: z.number(),
      status: z.string().optional(),
      raw: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReviewExpressClient({
      token: ctx.auth.reviewExpressToken ?? ctx.auth.token
    });

    let result =
      ctx.input.action === 'cancel'
        ? await client.cancelEmailRequest(ctx.input.requestId)
        : await client.modifyEmailRequest(ctx.input.requestId, {
            locationId: ctx.input.updates?.locationId,
            partnerRequestId: ctx.input.updates?.partnerRequestId,
            recipient: ctx.input.updates?.recipient,
            checkin: ctx.input.updates?.checkin,
            checkout: ctx.input.updates?.checkout,
            language: ctx.input.updates?.language,
            country: ctx.input.updates?.country
          });

    let entries = Array.isArray(result) ? result : (result?.data ?? [result]);
    let entry = providerList(entries).find(item => item?.request_id === ctx.input.requestId);
    if (!entry) {
      throw createApiServiceError(
        'Tripadvisor did not return the email request identifier. The operation could not be confirmed.'
      );
    }
    if (entry.error != null || (Array.isArray(entry.errors) && entry.errors.length > 0)) {
      throw buildApiServiceError(
        { response: { data: entry } },
        {
          providerLabel: 'Tripadvisor',
          reason: 'tripadvisor_review_request_error',
          nestedKeys: ['error', 'errors']
        }
      );
    }
    let confirmed = ctx.input.action === 'cancel' ? entry.canceled === 1 : entry.updated === 1;
    if (!confirmed) {
      throw createApiServiceError(
        'Tripadvisor did not confirm the requested email update or cancellation.'
      );
    }

    return {
      output: {
        success: true,
        requestId: entry.request_id,
        status: optionalString(entry.status),
        raw: entry
      },
      message: `${ctx.input.action === 'cancel' ? 'Cancelled' : 'Modified'} review request **#${entry.request_id}**.`
    };
  })
  .build();
