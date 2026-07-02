import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDealStages = SlateTool.create(spec, {
  name: 'List Deal Stages',
  key: 'list_deal_stages',
  description: `Retrieve all deal pipeline stages configured in Pipeline CRM. Useful for finding stage IDs when creating or updating deals.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      stages: z
        .array(
          z.object({
            stageId: z.number().describe('Unique stage ID'),
            name: z.string().nullable().optional().describe('Stage name'),
            position: z.number().nullable().optional().describe('Stage position/order')
          })
        )
        .describe('List of deal pipeline stages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let stages = await client.listDealStages();

    let stageList = (Array.isArray(stages) ? stages : []).map((stage: any) => ({
      stageId: stage.id,
      name: stage.name ?? null,
      position: stage.position ?? null
    }));

    return {
      output: {
        stages: stageList
      },
      message: `Found **${stageList.length}** deal stages`
    };
  })
  .build();
