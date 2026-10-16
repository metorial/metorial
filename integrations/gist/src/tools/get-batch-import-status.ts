import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredText } from '../lib/response';
import { spec } from '../spec';

export let getBatchImportStatus = SlateTool.create(spec, {
  name: 'Get Batch Import Status',
  key: 'get_batch_import_status',
  description:
    'Check a batch_import_contacts job and inspect completed import errors. Queued jobs may omit import counts and errors.',
  tags: { readOnly: true }
})
  .input(
    z.object({ batchId: z.string().describe('Batch ID returned by batch_import_contacts') })
  )
  .output(
    z.object({
      batchId: z.string(),
      status: z.string(),
      importedContacts: z.number().optional(),
      errors: z.array(z.any()).optional(),
      rawResponse: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });
    let data = await client.getBatchStatus(ctx.input.batchId);
    if (data.imported_contacts !== undefined && typeof data.imported_contacts !== 'number') {
      throw createApiServiceError('Gist returned an invalid imported contact count.', {
        reason: 'invalid_response'
      });
    }
    return {
      output: {
        batchId: ctx.input.batchId,
        status: requiredText(data.status),
        importedContacts: data.imported_contacts,
        errors: data.errors,
        rawResponse: client.responses
      },
      message: `Batch **${ctx.input.batchId}** is **${requiredText(data.status)}**.`
    };
  })
  .build();
