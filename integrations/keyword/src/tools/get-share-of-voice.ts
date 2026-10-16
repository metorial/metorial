import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getCollection } from '../lib/response';
import { spec } from '../spec';

export let getShareOfVoice = SlateTool.create(spec, {
  name: 'Get Share of Voice',
  key: 'get_share_of_voice',
  description:
    'Retrieve the latest top 10 competing domains by share of voice for a tracking project or group, including estimated clicks, percentages, and monthly changes. Call list_projects to discover project names.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectName: z
        .string()
        .describe('Project name or full Parent[sub]Child group name from list_projects')
    })
  )
  .output(z.object({ domains: z.array(z.any()), rawResponse: z.any() }))
  .handleInvocation(async ctx => {
    let response = await new Client({ token: ctx.auth.token }).getShareOfVoice(
      ctx.input.projectName
    );
    return {
      message: 'Retrieved the latest share-of-voice domains.',
      output: { domains: getCollection(response, 'domains'), rawResponse: response }
    };
  })
  .build();
