import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { configInput, projectInput } from '../lib/schemas';
import { spec } from '../spec';

export let listSecretNames = SlateTool.create(spec, {
  key: 'list_secret_names',
  name: 'List Secret Names',
  description:
    'List secret names in a Doppler config without retrieving their values. Discover projects with manage_projects and configs with manage_configs before choosing a target.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      project: projectInput,
      config: configInput,
      includeManagedSecrets: z
        .boolean()
        .optional()
        .describe(
          'Include Doppler-managed secret names; defaults to the provider setting of true'
        )
    })
  )
  .output(
    z.object({ names: z.array(z.string()).describe('Secret names returned by Doppler') })
  )
  .handleInvocation(async ctx => {
    let names = await new DopplerClient({ token: ctx.auth.token }).listSecretNames(
      ctx.input.project,
      ctx.input.config,
      ctx.input.includeManagedSecrets
    );
    return { output: { names }, message: `Found **${names.length}** secret names.` };
  })
  .build();
