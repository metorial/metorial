import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseMetadataFields } from '../lib/types';
import { spec } from '../spec';

export let createRandomId = SlateTool.create(spec, {
  name: 'Create Random ID',
  key: 'create_random_id',
  description:
    'Request a provider-generated anonymous identifier for an end user when your application has no stable user identifier. Retain the returned randomId and reuse it as customerId for that user. This does not identify the connected GIPHY account.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      ...responseMetadataFields,
      randomId: z.string().describe('Provider-issued anonymous end-user identifier')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createRandomId();
    return { output: result, message: 'Created an anonymous end-user identifier.' };
  })
  .build();
