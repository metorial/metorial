import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let validateRecordId = (id: number) => {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createApiServiceError('The record ID must be a positive whole number.');
  }
};

export let expireAccess = SlateTool.create(spec, {
  name: 'Expire Course Access',
  key: 'expire_access',
  description: 'Expire an existing course access record by its access record ID.',
  tags: { destructive: true }
})
  .input(
    z.object({
      accessId: z.number().describe('The access record ID to expire, not the course ID.')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('The unmodified access update response from Spotlightr.')
    })
  )
  .handleInvocation(async ctx => {
    validateRecordId(ctx.input.accessId);
    let client = new Client({ token: ctx.auth.token });
    let result = await client.expireAccess(ctx.input.accessId);
    return { output: { result }, message: 'Processed the course access expiration request.' };
  })
  .build();

export let expireAccessCode = SlateTool.create(spec, {
  name: 'Expire Gallery Access Code',
  key: 'expire_access_code',
  description: 'Expire an existing gallery access code by its code record ID.',
  tags: { destructive: true }
})
  .input(
    z.object({
      codeId: z.number().describe('The code record ID to expire, not the access code text.')
    })
  )
  .output(
    z.object({
      result: z
        .unknown()
        .describe('The unmodified access code update response from Spotlightr.')
    })
  )
  .handleInvocation(async ctx => {
    validateRecordId(ctx.input.codeId);
    let client = new Client({ token: ctx.auth.token });
    let result = await client.expireAccessCode(ctx.input.codeId);
    return {
      output: { result },
      message: 'Processed the gallery access code expiration request.'
    };
  })
  .build();
