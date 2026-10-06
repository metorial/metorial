import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { applicationOutputSchema, mapApplication } from '../lib/mappers';
import { spec } from '../spec';
export const getApplicationTool = SlateTool.create(spec, {
  key: 'get_application',
  name: 'Get Application',
  description: 'Get Application. Uses Harvest v3 permissions and verified resource IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      applicationId: z.string().describe('The Greenhouse application ID')
    })
  )
  .output(applicationOutputSchema)
  .handleInvocation(async ctx => {
    return {
      output: mapApplication(
        await new GreenhouseClient(ctx.auth, ctx.config).getApplication(
          ctx.input.applicationId
        )
      ),
      message: 'Retrieved the requested application.'
    };
  })
  .build();
