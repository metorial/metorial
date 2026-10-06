import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, records } from '../lib/client';
import { spec } from '../spec';

export const lookupFields = SlateTool.create(spec, {
  name: 'Lookup Fields',
  key: 'lookup_fields',
  description:
    'Discover supported input or output field names for a ZoomInfo search or enrichment operation. Use output fields when requesting selected enrichment data.',
  constraints: [
    'Requires a current GTM API connection. Technology, hashtag, org chart and corporate hierarchy entities support enrichment field lookup only.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      operation: z.enum(['search', 'enrich']),
      entity: z.enum([
        'contact',
        'company',
        'scoop',
        'news',
        'intent',
        'technology',
        'hashtag',
        'orgChart',
        'corporate-hierarchy'
      ]),
      fieldType: z.enum(['input', 'output'])
    })
  )
  .output(
    z.object({ fields: z.array(z.record(z.string(), z.unknown())), returnedCount: z.number() })
  )
  .handleInvocation(async ctx => {
    const fields = records(
      await Client.fromContext(ctx).lookupFields(
        ctx.input.operation,
        ctx.input.entity,
        ctx.input.fieldType
      )
    );
    return {
      output: { fields, returnedCount: fields.length },
      message: `Retrieved ${fields.length} ${ctx.input.fieldType} field(s) for ${ctx.input.entity} ${ctx.input.operation}.`
    };
  })
  .build();
