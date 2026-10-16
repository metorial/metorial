import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getQualitySettings = SlateTool.create(spec, {
  name: 'Get Repository Quality Settings',
  key: 'get_quality_settings',
  description:
    'Read a repository’s quality thresholds for issue percentage, duplication, complexity, and coverage. Call list_repositories to discover repository names.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Repository name from list_repositories.')
    })
  )
  .output(z.object({ settings: z.record(z.string(), z.unknown()), raw: z.unknown() }))
  .handleInvocation(async ctx => {
    let response = await createClient(ctx).getRepositoryQualitySettings(
      ctx.input.repositoryName
    );
    return {
      output: { settings: response.data ?? response, raw: response },
      message: 'Retrieved repository quality thresholds.'
    };
  })
  .build();
