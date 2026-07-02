import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let getExperience = SlateTool.create(spec, {
  name: 'Get Experience',
  key: 'get_experience',
  description: `Retrieve detailed information about a specific Appcues experience by its ID and type. Returns full metadata including name, publish status, frequency, steps, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      experienceType: z
        .enum(['flow', 'pin', 'banner', 'launchpad', 'checklist', 'mobile', 'nps', 'embed'])
        .describe('The type of experience to retrieve'),
      experienceId: z.string().describe('The ID of the experience')
    })
  )
  .output(
    z.object({
      experienceId: z.string().describe('Unique identifier for the experience'),
      name: z.string().describe('Name of the experience'),
      published: z.boolean().describe('Whether the experience is published'),
      experienceType: z.string().describe('Type of experience'),
      createdAt: z.string().optional().describe('When the experience was created'),
      updatedAt: z.string().optional().describe('When the experience was last updated'),
      frequency: z.string().optional().describe('Frequency setting'),
      tags: z.array(z.string()).optional().describe('Tags associated with the experience'),
      raw: z.any().optional().describe('Full raw response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let fetchMap: Record<string, (id: string) => Promise<any>> = {
      flow: id => client.getFlow(id),
      pin: id => client.getPin(id),
      banner: id => client.getBanner(id),
      launchpad: id => client.getLaunchpad(id),
      checklist: id => client.getChecklist(id),
      mobile: id => client.getMobileExperience(id),
      nps: id => client.getNps(id),
      embed: id => client.getEmbed(id)
    };

    let fetchFn = fetchMap[ctx.input.experienceType];
    if (!fetchFn) {
      throw new Error(`Unsupported experience type: ${ctx.input.experienceType}`);
    }
    let item = await fetchFn(ctx.input.experienceId);

    return {
      output: {
        experienceId: item.id || item.ID || ctx.input.experienceId,
        name: item.name || item.Name || '',
        published: item.published ?? item.Published ?? false,
        experienceType: ctx.input.experienceType,
        createdAt: item.created_at || item.createdAt || undefined,
        updatedAt: item.updated_at || item.updatedAt || undefined,
        frequency: item.frequency || undefined,
        tags: item.tags
          ? Array.isArray(item.tags)
            ? item.tags.map((t: any) => t.name || t)
            : undefined
          : undefined,
        raw: item
      },
      message: `Retrieved **${ctx.input.experienceType}** experience: **${item.name || item.Name || ctx.input.experienceId}** (${item.published ? 'published' : 'unpublished'}).`
    };
  })
  .build();
