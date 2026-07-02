import { SlateTool } from 'slates';
import { z } from 'zod';
import { listWebsites } from '../lib/admin';
import { spec } from '../spec';

export let listWebsitesTool = SlateTool.create(spec, {
  name: 'List Websites',
  key: 'list_websites',
  description: `List all websites tracked in your Simple Analytics account. Returns each website's hostname, creation date, and configuration. Requires both API key and User-Id authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      websites: z
        .array(
          z.object({
            hostname: z.string().describe('Website domain name'),
            isPublic: z
              .boolean()
              .optional()
              .describe('Whether the analytics data is publicly accessible'),
            timezone: z.string().optional().describe('Configured timezone for the website'),
            label: z.string().optional().describe('Custom label assigned to the website'),
            createdAt: z.string().optional().describe('When the website was added')
          })
        )
        .describe('List of tracked websites')
    })
  )
  .handleInvocation(async ctx => {
    let data = await listWebsites({ token: ctx.auth.token, userId: ctx.auth.userId });

    let websites: Record<string, unknown>[] = [];
    let rawList = Array.isArray(data) ? data : (data?.websites ?? data?.data ?? []);

    for (let site of rawList) {
      websites.push({
        hostname: site.hostname ?? site.domain ?? '',
        isPublic: site.public ?? site.isPublic,
        timezone: site.timezone,
        label: site.label,
        createdAt: site.created_at ?? site.createdAt
      });
    }

    return {
      output: { websites: websites as any },
      message: `Found **${websites.length}** website(s) in your Simple Analytics account.`
    };
  })
  .build();
