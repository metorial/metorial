import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let linkClicked = SlateTrigger.create(spec, {
  name: 'Link Clicked',
  key: 'link_clicked',
  description:
    'Triggers when a tracked link is clicked. Due to high volume, click webhooks must be scoped to specific links. Configure the webhook in your Dub workspace settings and associate webhook IDs with the links you want to monitor.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      clickData: z.any().describe('Click data from the webhook payload'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      clickId: z.string().describe('Unique click ID'),
      linkId: z.string().describe('ID of the clicked link'),
      domain: z.string().describe('Domain of the clicked link'),
      slug: z.string().describe('Slug of the clicked link'),
      shortLink: z.string().describe('Full short link URL'),
      destinationUrl: z.string().describe('The destination URL'),
      country: z.string().nullable().describe('Visitor country'),
      city: z.string().nullable().describe('Visitor city'),
      region: z.string().nullable().describe('Visitor region'),
      device: z.string().nullable().describe('Visitor device type'),
      browser: z.string().nullable().describe('Visitor browser'),
      os: z.string().nullable().describe('Visitor OS'),
      referer: z.string().nullable().describe('Referrer URL'),
      ip: z.string().nullable().describe('Visitor IP address'),
      timestamp: z.string().describe('Click timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        id: string;
        event: string;
        createdAt: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventId: body.id,
            clickData: body.data,
            timestamp: body.createdAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.clickData;
      let click = data.click ?? data;
      let link = data.link ?? {};

      return {
        type: 'link.clicked',
        id: ctx.input.eventId,
        output: {
          clickId: click.id ?? '',
          linkId: link.id ?? '',
          domain: link.domain ?? '',
          slug: link.key ?? '',
          shortLink: link.shortLink ?? '',
          destinationUrl: link.url ?? '',
          country: click.country ?? null,
          city: click.city ?? null,
          region: click.region ?? null,
          device: click.device ?? null,
          browser: click.browser ?? null,
          os: click.os ?? null,
          referer: click.referer ?? null,
          ip: click.ip ?? null,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
