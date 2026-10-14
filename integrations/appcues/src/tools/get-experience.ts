import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { mapExperience } from '../lib/experience';
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
        .enum([
          'flow',
          'flow_v2',
          'pin',
          'banner',
          'launchpad',
          'checklist',
          'mobile',
          'nps',
          'embed'
        ])
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
      flow_v2: id => client.getFlowV2(id),
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
      throw createApiServiceError(`Unsupported experience type: ${ctx.input.experienceType}`);
    }
    let item = await fetchFn(ctx.input.experienceId);

    return {
      output: {
        ...mapExperience(item, ctx.input.experienceType, ctx.input.experienceId),
        raw: item
      },
      message: `Retrieved **${ctx.input.experienceType}** experience: **${item.name || item.Name || item.internal_name || item.title || ctx.input.experienceId}** (${item.published ? 'published' : 'unpublished'}).`
    };
  })
  .build();
