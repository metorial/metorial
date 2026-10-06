import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getOrganizationsTool = SlateTool.create(spec, {
  name: 'Get Organizations',
  key: 'get_organizations',
  description:
    'Discover organizations accessible to the current Buffer connection, including IDs needed for channels, post lists and configuration. Stored legacy REST credentials require a new current connection for organization discovery.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(
        z.object({ organizationId: z.string(), name: z.string(), channelCount: z.number() })
      ),
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const organizations = (await new Client(ctx.auth).getOrganizations()).map(item => ({
      organizationId: item.id,
      name: item.name,
      channelCount: item.channelCount
    }));
    return {
      output: { organizations, returnedCount: organizations.length },
      message: `Retrieved ${organizations.length} Buffer organization(s).`
    };
  })
  .build();
