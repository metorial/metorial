import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getRealtimeDocument = SlateTool.create(spec, {
  key: 'get_realtime_document',
  name: 'Get Realtime Document',
  description:
    'Fetch a current official document directly from Handelsregister and return its download URL. Supports current, chronological, historical extracts, shareholder lists, articles, and structured XML. Discover company_id using search_companies. Costs credits even though it is read-only.',
  tags: { readOnly: true }
})
  .input(inputs.realtimeDocumentInput)
  .output(out.realtimeDocumentOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get realtime document',
      '/v1/document',
      out.realtimeDocumentOutput,
      { params: ctx.input }
    );
    return { output: result, message: 'Get realtime document completed.' };
  })
  .build();
