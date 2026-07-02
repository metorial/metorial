import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let performerSchema = z.object({
  performerId: z.number().describe('Unique performer ID'),
  name: z.string().describe('Full performer name'),
  shortName: z.string().describe('Abbreviated performer name'),
  url: z.string().describe('SeatGeek URL for the performer'),
  image: z.string().nullable().describe('Primary performer image URL'),
  score: z.number().describe('Popularity score from 0 to 1'),
  slug: z.string().describe('URL-friendly performer identifier'),
  type: z.string().describe('Performer type (e.g., "band", "nfl", "mlb")'),
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
    .describe('Music genres (for music performers)'),
  links: z
    .array(
      z.object({
        provider: z.string().describe('External service provider (e.g., "spotify", "lastfm")'),
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
        displayType: z.string().describe('Division type (e.g., "Conference", "Division")')
      })
    )
    .describe('Sports divisions/conferences')
});

export let searchPerformers = SlateTool.create(spec, {
  name: 'Search Performers',
  key: 'search_performers',
  description: `Search for performers on SeatGeek including artists, bands, sports teams, and more. Returns performer details with images, genres, external links, popularity scores, and upcoming event counts.`,
  instructions: [
    'Use the "query" parameter for natural language searches like "taylor swift" or "new york yankees".',
    'Use taxonomyName to filter by category (e.g., "sports", "concert").',
    'Use genreSlug to filter by music genre (e.g., "rock", "hip-hop").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Full-text search query (e.g., "taylor swift", "yankees")'),
      performerIds: z
        .array(z.number())
        .optional()
        .describe('Filter by specific performer IDs'),
      slug: z.string().optional().describe('Filter by performer slug'),
      taxonomyName: z
        .string()
        .optional()
        .describe('Filter by taxonomy name (e.g., "sports", "concert")'),
      taxonomyId: z.number().optional().describe('Filter by taxonomy ID'),
      genreSlug: z
        .string()
        .optional()
        .describe('Filter by genre slug (e.g., "rock", "hip-hop")'),
      primaryGenreSlug: z.string().optional().describe('Filter by primary genre slug'),
      page: z.number().optional().describe('Page number (1-indexed). Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 10')
    })
  )
  .output(
    z.object({
      performers: z.array(performerSchema).describe('List of matching performers'),
      total: z.number().describe('Total number of matching performers'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      affiliateId: ctx.config.affiliateId,
      referralId: ctx.config.referralId
    });

    let params: Record<string, string> = {};

    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.performerIds?.length) params.id = ctx.input.performerIds.join(',');
    if (ctx.input.slug) params.slug = ctx.input.slug;
    if (ctx.input.taxonomyName) params['taxonomies.name'] = ctx.input.taxonomyName;
    if (ctx.input.taxonomyId) params['taxonomies.id'] = String(ctx.input.taxonomyId);
    if (ctx.input.genreSlug) params['genres.slug'] = ctx.input.genreSlug;
    if (ctx.input.primaryGenreSlug)
      params['genres[primary].slug'] = ctx.input.primaryGenreSlug;
    if (ctx.input.page) params.page = String(ctx.input.page);
    if (ctx.input.perPage) params.per_page = String(ctx.input.perPage);

    let response = await client.searchPerformers(params);

    let performers = response.performers.map(p => ({
      performerId: p.id,
      name: p.name,
      shortName: p.short_name,
      url: p.url,
      image: p.image || null,
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
    }));

    let total = response.meta.total;
    let page = response.meta.page;
    let perPage = response.meta.per_page;

    let summaryParts = [`Found **${total}** performer(s)`];
    if (ctx.input.query) summaryParts.push(`matching "${ctx.input.query}"`);
    summaryParts.push(`(page ${page}, showing ${performers.length} of ${total})`);

    if (performers.length > 0) {
      summaryParts.push('\n\nTop results:');
      for (let p of performers.slice(0, 5)) {
        let extra =
          p.numUpcomingEvents > 0
            ? ` — ${p.numUpcomingEvents} upcoming events`
            : ' — no upcoming events';
        summaryParts.push(`- **${p.name}** (${p.type}, score: ${p.score.toFixed(2)})${extra}`);
      }
    }

    return {
      output: { performers, total, page, perPage },
      message: summaryParts.join('\n')
    };
  })
  .build();
