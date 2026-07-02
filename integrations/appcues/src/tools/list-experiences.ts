import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

let experienceSchema = z.object({
  experienceId: z.string().describe('Unique identifier for the experience'),
  name: z.string().describe('Name of the experience'),
  published: z.boolean().describe('Whether the experience is currently published'),
  experienceType: z
    .string()
    .describe(
      'Type of experience (flow, pin, banner, launchpad, checklist, mobile, nps, embed)'
    ),
  createdAt: z.string().optional().describe('When the experience was created'),
  updatedAt: z.string().optional().describe('When the experience was last updated'),
  frequency: z.string().optional().describe('Frequency setting (e.g. once, every_time)'),
  tags: z.array(z.string()).optional().describe('Tags associated with the experience')
});

export let listExperiences = SlateTool.create(spec, {
  name: 'List Experiences',
  key: 'list_experiences',
  description: `List all experiences in your Appcues account. Supports filtering by experience type to retrieve flows, pins, banners, launchpads, checklists, mobile experiences, NPS surveys, or embeds. Returns key metadata including publish status, name, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      experienceType: z
        .enum(['flow', 'pin', 'banner', 'launchpad', 'checklist', 'mobile', 'nps', 'embed'])
        .optional()
        .describe('Filter by experience type. If omitted, returns all experience types.')
    })
  )
  .output(
    z.object({
      experiences: z.array(experienceSchema).describe('List of experiences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let types = ctx.input.experienceType
      ? [ctx.input.experienceType]
      : ['flow', 'pin', 'banner', 'launchpad', 'checklist', 'mobile', 'nps', 'embed'];

    let allExperiences: z.infer<typeof experienceSchema>[] = [];

    let fetchMap: Record<string, () => Promise<any[]>> = {
      flow: () => client.listFlows(),
      pin: () => client.listPins(),
      banner: () => client.listBanners(),
      launchpad: () => client.listLaunchpads(),
      checklist: () => client.listChecklists(),
      mobile: () => client.listMobileExperiences(),
      nps: () => client.listNps(),
      embed: () => client.listEmbeds()
    };

    for (let type of types) {
      try {
        let fetchFn = fetchMap[type];
        if (!fetchFn) continue;
        let items = await fetchFn();
        if (Array.isArray(items)) {
          for (let item of items) {
            allExperiences.push({
              experienceId: item.id || item.ID || '',
              name: item.name || item.Name || '',
              published: item.published ?? item.Published ?? false,
              experienceType: type,
              createdAt: item.created_at || item.createdAt || undefined,
              updatedAt: item.updated_at || item.updatedAt || undefined,
              frequency: item.frequency || undefined,
              tags: item.tags
                ? Array.isArray(item.tags)
                  ? item.tags.map((t: any) => t.name || t)
                  : undefined
                : undefined
            });
          }
        }
      } catch (e) {
        ctx.warn(`Failed to fetch ${type} experiences: ${e}`);
      }
    }

    return {
      output: { experiences: allExperiences },
      message: `Found **${allExperiences.length}** experience(s)${ctx.input.experienceType ? ` of type **${ctx.input.experienceType}**` : ' across all types'}.`
    };
  })
  .build();
