import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompanyMetadata = SlateTool.create(spec, {
  name: 'Get Company Metadata',
  key: 'get_company_metadata',
  description:
    'Retrieves SuiteDash company attribute definitions and public, private, and target custom field metadata. Use it to discover the company fields configured in your account.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Company attribute definitions returned by SuiteDash')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let metadata = await client.getCompanyMeta();
    return {
      output: { metadata },
      message: 'Retrieved company metadata.'
    };
  })
  .build();
