import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPerformerDetails = SlateTool.create(spec, {
  name: 'Get Performer Details',
  key: 'get_performer_details',
  description: `Retrieve full details for a specific performer by their SeatGeek performer ID. Returns comprehensive performer information including name, images in multiple sizes, genres, external links (Spotify, Last.fm), popularity score, and sports division/conference data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      performerId: z.number().describe('SeatGeek performer ID')
    })
  )
  .output(
    z.object({
      performerId: z.number().describe('Unique performer ID'),
      name: z.string().describe('Full performer name'),
      shortName: z.string().describe('Abbreviated performer name'),
      url: z.string().describe('SeatGeek URL for the performer'),
      image: z.string().nullable().describe('Primary performer image URL'),
      images: z
        .record(z.string(), z.string())
        .describe(
          'Performer images in multiple sizes (huge, large, medium, small, banner, etc.)'
        ),
      score: z.number().describe('Popularity score from 0 to 1'),
      slug: z.string().describe('URL-friendly performer identifier'),
      type: z.string().describe('Performer type'),
      hasUpcomingEvents: z.boolean().describe('Whether the performer has upcoming events'),
      numUpcomingEvents: z.number().describe('Number of upcoming events'),
      taxonomies: z
        .array(
          z.object({
            taxonomyId: z.number().describe('Taxonomy ID'),
            name: z.string().describe('Taxonomy name')
          })
        )
        .describe('Performer categories'),
      genres: z
        .array(
          z.object({
            genreId: z.number().describe('Genre ID'),
            name: z.string().describe('Genre name'),
            slug: z.string().describe('Genre slug'),
            primary: z.boolean().describe('Whether this is the primary genre')
          })
        )
        .describe('Music genres'),
      links: z
        .array(
          z.object({
            provider: z.string().describe('External service provider'),
            linkId: z.string().describe('Provider-specific ID'),
            url: z.string().describe('External URL')
          })
        )
        .describe('External links (Spotify, Last.fm, etc.)'),
      divisions: z
        .array(
          z.object({
            shortName: z.string().describe('Division short name'),
            displayName: z.string().describe('Division display name'),
            displayType: z.string().describe('Division type')
          })
        )
        .describe('Sports divisions/conferences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      affiliateId: ctx.config.affiliateId,
      referralId: ctx.config.referralId
    });

    let p = await client.getPerformer(ctx.input.performerId);

    let images: Record<string, string> = {};
    if (p.images) {
      for (let [key, value] of Object.entries(p.images)) {
        if (value) images[key] = value;
      }
    }

    let output = {
      performerId: p.id,
      name: p.name,
      shortName: p.short_name,
      url: p.url,
      image: p.image || null,
      images,
      score: p.score,
      slug: p.slug,
      type: p.type,
      hasUpcomingEvents: p.has_upcoming_events,
      numUpcomingEvents: p.num_upcoming_events,
      taxonomies: p.taxonomies.map(t => ({
        taxonomyId: t.id,
        name: t.name
      })),
      genres: (p.genres || []).map(g => ({
        genreId: g.id,
        name: g.name,
        slug: g.slug,
        primary: g.primary
      })),
      links: (p.links || []).map(l => ({
        provider: l.provider,
        linkId: l.id,
        url: l.url
      })),
      divisions: (p.divisions || []).map(d => ({
        shortName: d.short_name,
        displayName: d.display_name,
        displayType: d.display_type
      }))
    };

    let genreStr =
      output.genres.length > 0
        ? ` | Genres: ${output.genres.map(g => g.name).join(', ')}`
        : '';
    let linkStr =
      output.links.length > 0
        ? ` | Links: ${output.links.map(l => l.provider).join(', ')}`
        : '';
    let divStr =
      output.divisions.length > 0
        ? ` | ${output.divisions.map(d => `${d.displayType}: ${d.displayName}`).join(', ')}`
        : '';
    let message = `**${p.name}** (${p.type})\nScore: ${p.score.toFixed(2)} | ${p.num_upcoming_events} upcoming events${genreStr}${linkStr}${divStr}\n🔗 [View on SeatGeek](${p.url})`;

    return {
      output,
      message
    };
  })
  .build();
