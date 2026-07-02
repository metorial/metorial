import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let getVisitor = SlateTool.create(spec, {
  name: 'Get Visitor',
  key: 'get_visitor',
  description: `Retrieve a visitor record from Pendo by visitor ID. Returns visitor metadata including custom fields, first and last visit timestamps, and associated account information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      visitorId: z.string().describe('The unique visitor ID in Pendo')
    })
  )
  .output(
    z.object({
      visitorId: z.string().describe('The visitor ID'),
      metadata: z
        .any()
        .optional()
        .describe('Visitor metadata including auto and custom fields'),
      firstVisit: z.string().optional().describe('Timestamp of the first visit'),
      lastVisit: z.string().optional().describe('Timestamp of the last visit'),
      accountIds: z.array(z.string()).optional().describe('Associated account IDs'),
      raw: z.any().describe('Full raw visitor record from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);

    let visitor = await client.getVisitor(ctx.input.visitorId);

    return {
      output: {
        visitorId: visitor.visitorId || ctx.input.visitorId,
        metadata: visitor.metadata,
        firstVisit: visitor.metadata?.auto?.firstvisit
          ? String(visitor.metadata.auto.firstvisit)
          : undefined,
        lastVisit: visitor.metadata?.auto?.lastvisit
          ? String(visitor.metadata.auto.lastvisit)
          : undefined,
        accountIds: visitor.accountIds,
        raw: visitor
      },
      message: `Retrieved visitor **${ctx.input.visitorId}** from Pendo.`
    };
  })
  .build();
