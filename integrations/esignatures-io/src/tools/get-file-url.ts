import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getSignedPdfDetails } from '../lib/files';
import { spec } from '../spec';

let referenceSchema = z.object({ contractId: z.string().min(1) });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The signed PDF reference is invalid. Retrieve the contract again.'
    );
  }
  let result = await new Client(ctx.auth).queryContract(reference.data.contractId);
  return getSignedPdfDetails(result.data.contract);
});
