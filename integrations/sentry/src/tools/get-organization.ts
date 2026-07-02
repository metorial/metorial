import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getOrganizationTool = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve details about the configured Sentry organization, including quotas, settings, features, and member/project counts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z.string(),
      organizationSlug: z.string(),
      name: z.string(),
      dateCreated: z.string().optional(),
      isDefault: z.boolean().optional(),
      status: z.any().optional(),
      features: z.array(z.string()).optional(),
      quota: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let org = await client.getOrganization();

    return {
      output: {
        organizationId: String(org.id),
        organizationSlug: org.slug || '',
        name: org.name || '',
        dateCreated: org.dateCreated,
        isDefault: org.isDefault,
        status: org.status,
        features: org.features,
        quota: org.quota
      },
      message: `Retrieved organization **${org.name}** (${org.slug}).`
    };
  })
  .build();
