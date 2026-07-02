import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let getSectorPerformance = SlateTool.create(spec, {
  name: 'Get Sector Performance',
  key: 'get_sector_performance',
  description: `Retrieve current performance data for all US stock market sectors. Shows how each sector is performing relative to others. Useful for sector rotation analysis and identifying market trends.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sectors: z
        .array(
          z.object({
            sector: z.string().optional().describe('Sector name'),
            changePercentage: z.string().optional().describe('Performance percentage change')
          })
        )
        .describe('Sector performance data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });

    let data = await client.getSectorPerformance();

    let rawSectors = Array.isArray(data) ? data : data?.sectors || data?.results || [];
    let sectors = rawSectors.map((s: any) => ({
      sector: s.sector ?? s.name,
      changePercentage: s.changesPercentage ?? s.change_percentage ?? s.performance
    }));

    return {
      output: { sectors },
      message: `Retrieved performance data for **${sectors.length}** sectors.`
    };
  })
  .build();
