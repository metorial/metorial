import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { rejectionReasonSchema } from '../lib/models';
import { spec } from '../spec';
export const listRejectionReasonsTool = SlateTool.create(spec, {
  key: 'list_rejection_reasons',
  name: 'List Rejection Reasons',
  description:
    'Discover organization rejection reason IDs required by reject_application. Follow nextCursor for further results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      perPage: z
        .number()
        .optional()
        .describe('First-page size, between 1 and 500; default 50.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the preceding response. Pass cursor alone.')
    })
  )
  .output(
    z.object({
      reasons: z.array(
        z.object({
          rejectionReasonId: z.string(),
          name: rejectionReasonSchema.shape.name,
          type: rejectionReasonSchema.shape.type
        })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listRejectionReasons(
      ctx.input
    );
    return {
      output: {
        reasons: page.items.map(row => ({
          rejectionReasonId: String(row.id),
          name: row.name,
          type: row.type
        })),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} rejection reason(s).`
    };
  })
  .build();
