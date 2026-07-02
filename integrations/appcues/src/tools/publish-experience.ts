import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let publishExperience = SlateTool.create(spec, {
  name: 'Publish Experience',
  key: 'publish_experience',
  description: `Publish or unpublish an Appcues experience. Supports all experience types: flows, pins, banners, launchpads, checklists, mobile experiences, NPS surveys, and embeds. Publishing makes the experience visible to users; unpublishing hides it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      experienceType: z
        .enum(['flow', 'pin', 'banner', 'launchpad', 'checklist', 'mobile', 'nps', 'embed'])
        .describe('The type of experience'),
      experienceId: z.string().describe('The ID of the experience'),
      action: z
        .enum(['publish', 'unpublish'])
        .describe('Whether to publish or unpublish the experience')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      experienceId: z.string().describe('ID of the affected experience'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let publishMap: Record<string, (id: string) => Promise<any>> = {
      flow: id => client.publishFlow(id),
      pin: id => client.publishPin(id),
      banner: id => client.publishBanner(id),
      launchpad: id => client.publishLaunchpad(id),
      checklist: id => client.publishChecklist(id),
      mobile: id => client.publishMobileExperience(id),
      nps: id => client.publishNps(id),
      embed: id => client.publishEmbed(id)
    };

    let unpublishMap: Record<string, (id: string) => Promise<any>> = {
      flow: id => client.unpublishFlow(id),
      pin: id => client.unpublishPin(id),
      banner: id => client.unpublishBanner(id),
      launchpad: id => client.unpublishLaunchpad(id),
      checklist: id => client.unpublishChecklist(id),
      mobile: id => client.unpublishMobileExperience(id),
      nps: id => client.unpublishNps(id),
      embed: id => client.unpublishEmbed(id)
    };

    let actionFn =
      ctx.input.action === 'publish'
        ? publishMap[ctx.input.experienceType]
        : unpublishMap[ctx.input.experienceType];
    if (!actionFn) {
      throw new Error(`Unsupported experience type: ${ctx.input.experienceType}`);
    }
    await actionFn(ctx.input.experienceId);

    return {
      output: {
        success: true,
        experienceId: ctx.input.experienceId,
        action: ctx.input.action
      },
      message: `Successfully **${ctx.input.action === 'publish' ? 'published' : 'unpublished'}** ${ctx.input.experienceType} \`${ctx.input.experienceId}\`.`
    };
  })
  .build();
