import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

export let newLink = SlateTrigger.create(spec, {
  name: 'New FanLink Created',
  key: 'new_link',
  description:
    'Triggers when a new FanLink (smart link) is created. Polls the user profile for new links and detects additions since the last check.'
})
  .input(
    z.object({
      linkId: z.number().describe('Link ID'),
      title: z.string().optional().describe('Link title'),
      targetType: z.string().optional().describe('Link type'),
      targetUrl: z.string().optional().describe('Destination URL'),
      shortenedPath: z.string().optional().describe('Short URL path')
    })
  )
  .output(
    z.object({
      linkId: z.number().describe('Link ID'),
      title: z.string().optional().describe('Link title'),
      targetType: z.string().optional().describe('Link type (music, podcast, event, etc.)'),
      targetUrl: z.string().optional().describe('Destination URL'),
      shortenedPath: z.string().optional().describe('Short URL path'),
      subdomain: z.string().optional().describe('Link subdomain')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ToneDenClient({ token: ctx.auth.token });

      let knownIds: number[] = ctx.state?.knownLinkIds || [];
      let links = await client.listLinks('me', { limit: 50 });
      let currentIds = (links || []).map((l: any) => l.id);

      let newLinks = (links || []).filter((l: any) => !knownIds.includes(l.id));

      let inputs = newLinks.map((l: any) => ({
        linkId: l.id,
        title: l.title,
        targetType: l.target_type,
        targetUrl: l.target_url,
        shortenedPath: l.shortened_path
      }));

      return {
        inputs,
        updatedState: {
          knownLinkIds: [...new Set([...knownIds, ...currentIds])]
        }
      };
    },

    handleEvent: async ctx => {
      let client = new ToneDenClient({ token: ctx.auth.token });

      let link: any = {};
      try {
        link = await client.getLink(ctx.input.linkId);
      } catch {
        // Use the data from polling if fetch fails
      }

      return {
        type: 'link.created',
        id: `link-${ctx.input.linkId}`,
        output: {
          linkId: ctx.input.linkId,
          title: link?.title || ctx.input.title,
          targetType: link?.target_type || ctx.input.targetType,
          targetUrl: link?.target_url || ctx.input.targetUrl,
          shortenedPath: link?.shortened_path || ctx.input.shortenedPath,
          subdomain: link?.subdomain
        }
      };
    }
  })
  .build();
