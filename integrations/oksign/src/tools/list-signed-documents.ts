import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSignedDocuments = SlateTool.create(spec, {
  name: 'List Signed Documents',
  key: 'list_signed_documents',
  description:
    'List signing events in a time range for documents uploaded through the API. Returns source and signed document IDs, signer details, timestamps, and signature counts. An event may represent a partially signed document.',
  constraints: ['Rate limited to 1 request per 3 minutes.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      startTime: z.string().describe('Start time in ISO-8601 format with timezone'),
      endTime: z.string().describe('End time in ISO-8601 format with timezone')
    })
  )
  .output(
    z.object({
      signedDocuments: z.array(z.any()).describe('Signing events returned by OKSign')
    })
  )
  .handleInvocation(async ctx => {
    let start = Date.parse(ctx.input.startTime);
    let end = Date.parse(ctx.input.endTime);
    let format = z.iso.datetime({ offset: true });
    if (
      !format.safeParse(ctx.input.startTime).success ||
      !format.safeParse(ctx.input.endTime).success ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start >= end
    ) {
      throw createApiServiceError(
        'Provide ISO-8601 timestamps with timezones, with startTime before endTime.'
      );
    }
    let signedDocuments = await new Client({ token: ctx.auth.token }).getSignedDocuments(
      ctx.input.startTime,
      ctx.input.endTime
    );
    return {
      output: { signedDocuments },
      message: `Retrieved **${signedDocuments.length}** signing event(s).`
    };
  })
  .build();
