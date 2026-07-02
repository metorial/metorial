import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAnalyticsConfig = SlateTool.create(spec, {
  name: 'Get Analytics Config',
  key: 'get_analytics_config',
  description: `Retrieve available DNS query logging levels and analytics storage regions. Log levels control what gets recorded (off, basic, full). Storage regions determine where analytics data is kept geographically.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      levels: z.array(
        z.object({
          levelId: z.string().describe('Log level identifier'),
          name: z.string().describe('Log level name'),
          description: z.string().describe('Log level description')
        })
      ),
      storageRegions: z.array(
        z.object({
          regionId: z.string().describe('Storage region identifier'),
          name: z.string().describe('Region name'),
          description: z.string().describe('Region description')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let [levels, endpoints] = await Promise.all([
      client.listAnalyticsLevels(),
      client.listAnalyticsEndpoints()
    ]);

    return {
      output: {
        levels: levels.map(l => ({
          levelId: l.PK,
          name: l.name,
          description: l.description || ''
        })),
        storageRegions: endpoints.map(e => ({
          regionId: e.PK,
          name: e.name,
          description: e.description || ''
        }))
      },
      message: `Found **${levels.length}** log levels and **${endpoints.length}** storage regions.`
    };
  })
  .build();
