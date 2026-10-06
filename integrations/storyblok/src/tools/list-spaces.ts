import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export const listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description:
    'Discover accessible spaces in the credential region. Personal tokens list regional spaces; plugin OAuth reads its single authorized space. This does not enumerate other regions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      spaces: z.array(
        z.object({
          spaceId: z.number(),
          name: z.string().optional(),
          region: z.enum(['eu', 'us', 'ca', 'ap', 'cn']).optional(),
          plan: z.string().optional()
        })
      ),
      credentialRegion: z.enum(['eu', 'us', 'ca', 'ap', 'cn']),
      discovery: z.enum(['authorized_space', 'regional_spaces'])
    })
  )
  .handleInvocation(async ctx => {
    const result = await new StoryblokClient(ctx.auth).listSpaces();
    return {
      output: {
        spaces: result.spaces.map(s => ({
          spaceId: s.id,
          name: s.name,
          region: s.region,
          plan: s.plan
        })),
        credentialRegion: ctx.auth.region,
        discovery: result.discovery
      },
      message: 'Discovered spaces available to this credential in its region.'
    };
  })
  .build();
