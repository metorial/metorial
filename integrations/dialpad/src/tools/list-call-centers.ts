import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let listCallCentersTool = SlateTool.create(spec, {
  name: 'List Call Centers',
  key: 'list_call_centers',
  description: `List call centers for a specific office in your Dialpad account. Returns call center details including name, state, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      officeId: z.string().describe('Office ID to list call centers for'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      callCenters: z.array(
        z.object({
          callCenterId: z.string().describe('Call center ID'),
          name: z.string().optional(),
          description: z.string().optional(),
          officeId: z.string().optional(),
          state: z
            .string()
            .optional()
            .describe('Call center state (active, deleted, pending)'),
          dateCreated: z.string().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let result = await client.listCallCenters(ctx.input.officeId, {
      cursor: ctx.input.cursor
    });

    let callCenters = (result.items || []).map((cc: any) => ({
      callCenterId: String(cc.id),
      name: cc.name,
      description: cc.description,
      officeId: cc.office_id ? String(cc.office_id) : undefined,
      state: cc.state,
      dateCreated: cc.date_created
    }));

    return {
      output: {
        callCenters,
        nextCursor: result.cursor || undefined
      },
      message: `Found **${callCenters.length}** call center(s) in office ${ctx.input.officeId}`
    };
  })
  .build();
