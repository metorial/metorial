import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

let variantSchema = z.enum([
  'standard',
  'multi_channel',
  'scrubbed',
  'scrubbed_multi_channel'
]);
let fields = {
  standard: 'recording_url',
  multi_channel: 'recording_multi_channel_url',
  scrubbed: 'scrubbed_recording_url',
  scrubbed_multi_channel: 'scrubbed_recording_multi_channel_url'
} as const;
let referenceSchema = z.object({ callId: z.string().min(1), variant: variantSchema });

let recordingDetails = async (
  client: RetellClient,
  reference: z.infer<typeof referenceSchema>
) => {
  let call = await client.getCall(reference.callId);
  let value: unknown = call[fields[reference.variant]];
  let parsed = z.string().url().safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'This recording is not available. Check that the call has ended and the agent stores the requested recording.'
    );
  let url = new URL(parsed.data);
  let expiresAt: string | undefined;
  let date = url.searchParams.get('X-Amz-Date');
  let duration = url.searchParams.get('X-Amz-Expires');
  if (date && /^\d{8}T\d{6}Z$/.test(date) && duration && /^\d+$/.test(duration)) {
    let issued = Date.parse(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`
    );
    let expiration = issued + Number(duration) * 1000;
    if (Number.isFinite(expiration) && Math.abs(expiration) < 8640000000000000)
      expiresAt = new Date(expiration - 60000).toISOString();
  }
  let expires = url.searchParams.get('Expires');
  if (!expiresAt && expires && /^\d+$/.test(expires)) {
    let expiration = Number(expires) * 1000;
    if (Number.isFinite(expiration) && Math.abs(expiration) < 8640000000000000)
      expiresAt = new Date(expiration - 60000).toISOString();
  }
  // Renew on the next download when the provider reports signing but omits a parseable expiry.
  if (!expiresAt && call.opt_in_signed_url) expiresAt = new Date().toISOString();
  return { url: parsed.data, expiresAt };
};

export let downloadCallRecording = SlateTool.create(spec, {
  name: 'Download Call Recording',
  key: 'download_call_recording',
  description:
    'Prepare a downloadable WAV recording for a completed call. Choose the standard, multichannel, or PII-scrubbed recording when available.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      callId: z.string().min(1).describe('Call ID from list_calls'),
      variant: variantSchema.optional().describe('Recording variant, default standard')
    })
  )
  .output(
    z.object({
      callId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      variant: variantSchema
    })
  )
  .handleInvocation(async ctx => {
    let reference = {
      callId: ctx.input.callId,
      variant: ctx.input.variant ?? ('standard' as const)
    };
    let file = await recordingDetails(new RetellClient(ctx.auth.token), reference);
    let filename = `${ctx.input.callId}-${reference.variant}.wav`;
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      filename,
      mimeType: 'audio/wav',
      ...(file.expiresAt ? { refreshReference: reference, refreshAt: file.expiresAt } : {})
    });
    return {
      output: {
        callId: ctx.input.callId,
        filename,
        mimeType: 'audio/wav',
        variant: reference.variant
      },
      message: `Prepared the ${reference.variant} recording for call **${ctx.input.callId}**.`
    };
  })
  .build();

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError(
      'The recording reference is invalid. Request the recording again.'
    );
  let file = await recordingDetails(new RetellClient(ctx.auth.token), parsed.data);
  return {
    url: file.url,
    expiresAt: file.expiresAt ?? new Date(Date.now() + 86400000).toISOString()
  };
});
