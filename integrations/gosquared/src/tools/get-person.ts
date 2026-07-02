import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve detailed profile information for a specific person in GoSquared People CRM. Returns all stored properties, activity data, and optionally their event feed and devices.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.string().describe('The person ID to look up'),
      includeFeed: z.boolean().optional().describe("Also retrieve the person's event feed"),
      includeDevices: z
        .boolean()
        .optional()
        .describe("Also retrieve the person's tracked devices")
    })
  )
  .output(
    z.object({
      person: z.record(z.string(), z.any()).describe('Full person profile'),
      feed: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe("Person's event feed (if requested)"),
      devices: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe("Person's tracked devices (if requested)")
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let person = await client.getPerson(ctx.input.personId);

    let feed: Record<string, any>[] | undefined;
    let devices: Record<string, any>[] | undefined;

    if (ctx.input.includeFeed) {
      let feedResult = await client.getPersonFeed(ctx.input.personId);
      feed = feedResult?.list || feedResult?.feed || [];
    }

    if (ctx.input.includeDevices) {
      let devicesResult = await client.getPersonDevices(ctx.input.personId);
      devices = devicesResult?.list || devicesResult?.devices || [];
    }

    return {
      output: { person, feed, devices },
      message: `Retrieved profile for person **${ctx.input.personId}**.`
    };
  })
  .build();
