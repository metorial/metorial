import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let episodeSchema = z.object({
  episodeId: z.string().describe('Episode ID.'),
  title: z.string().describe('Episode title.'),
  description: z.string().describe('Episode description.'),
  pubDateMs: z.number().describe('Published date as Unix timestamp in milliseconds.'),
  audio: z.string().describe('Audio file URL.'),
  audioLengthSec: z.number().describe('Audio length in seconds.'),
  image: z.string().describe('Episode image URL.'),
  thumbnail: z.string().describe('Episode thumbnail URL.'),
  explicitContent: z.boolean().describe('Whether the episode contains explicit content.'),
  listennotesUrl: z.string().describe('Listen Notes URL.'),
  link: z.string().describe('Web link for the episode.')
});

export let getPodcast = SlateTool.create(spec, {
  name: 'Get Podcast',
  key: 'get_podcast',
  description: `Fetch detailed metadata for a podcast by its Listen Notes ID. Returns full podcast information including title, publisher, description, RSS feed URL, genre IDs, listen score, and recent episodes.
Use **nextEpisodePubDate** for paginating through a podcast's episode list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      podcastId: z.string().describe('Listen Notes podcast ID.'),
      nextEpisodePubDate: z
        .number()
        .optional()
        .describe(
          'Unix timestamp (ms) for episode pagination. Use value from previous response to get next page of episodes.'
        ),
      episodeSort: z
        .enum(['recent_first', 'oldest_first'])
        .optional()
        .describe('Sort order for episodes. Defaults to "recent_first".')
    })
  )
  .output(
    z.object({
      podcastId: z.string().describe('Podcast ID.'),
      title: z.string().describe('Podcast title.'),
      publisher: z.string().describe('Publisher name.'),
      description: z.string().describe('Podcast description.'),
      language: z.string().describe('Podcast language.'),
      country: z.string().describe('Country of origin.'),
      website: z.string().describe('Podcast website URL.'),
      email: z.string().describe('Contact email.'),
      image: z.string().describe('Podcast image URL.'),
      thumbnail: z.string().describe('Podcast thumbnail URL.'),
      rss: z.string().describe('RSS feed URL.'),
      itunesId: z.number().describe('Apple Podcasts / iTunes ID.'),
      listennotesUrl: z.string().describe('Listen Notes URL.'),
      totalEpisodes: z.number().describe('Total number of episodes.'),
      audioLengthSec: z.number().describe('Average audio length in seconds.'),
      updateFrequencyHours: z.number().describe('Average update frequency in hours.'),
      explicitContent: z.boolean().describe('Whether the podcast has explicit content.'),
      listenScore: z.number().describe('Listen Score (0-100).'),
      listenScoreGlobalRank: z.string().describe('Global rank percentage.'),
      genreIds: z.array(z.number()).describe('Genre IDs.'),
      latestPubDateMs: z.number().describe('Latest episode publish date (Unix ms).'),
      earliestPubDateMs: z.number().describe('Earliest episode publish date (Unix ms).'),
      nextEpisodePubDate: z.number().optional().describe('Use this for paginating episodes.'),
      episodes: z.array(episodeSchema).describe('Recent episodes (up to 10 per page).'),
      isClaimed: z.boolean().describe('Whether the podcast has been claimed by its owner.'),
      type: z.string().describe('Podcast type (episodic or serial).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.getPodcast({
      podcastId: ctx.input.podcastId,
      nextEpisodePubDate: ctx.input.nextEpisodePubDate,
      sort: ctx.input.episodeSort
    });

    return {
      output: {
        podcastId: data.id,
        title: data.title,
        publisher: data.publisher,
        description: data.description,
        language: data.language,
        country: data.country,
        website: data.website || '',
        email: data.email || '',
        image: data.image || '',
        thumbnail: data.thumbnail || '',
        rss: data.rss || '',
        itunesId: data.itunes_id,
        listennotesUrl: data.listennotes_url,
        totalEpisodes: data.total_episodes,
        audioLengthSec: data.audio_length_sec,
        updateFrequencyHours: data.update_frequency_hours,
        explicitContent: data.explicit_content,
        listenScore: data.listen_score,
        listenScoreGlobalRank: data.listen_score_global_rank,
        genreIds: data.genre_ids,
        latestPubDateMs: data.latest_pub_date_ms,
        earliestPubDateMs: data.earliest_pub_date_ms,
        nextEpisodePubDate: data.next_episode_pub_date,
        episodes: (data.episodes || []).map(ep => ({
          episodeId: ep.id,
          title: ep.title,
          description: ep.description,
          pubDateMs: ep.pub_date_ms,
          audio: ep.audio,
          audioLengthSec: ep.audio_length_sec,
          image: ep.image || '',
          thumbnail: ep.thumbnail || '',
          explicitContent: ep.explicit_content,
          listennotesUrl: ep.listennotes_url,
          link: ep.link || ''
        })),
        isClaimed: data.is_claimed,
        type: data.type || 'episodic'
      },
      message: `Fetched podcast **${data.title}** by ${data.publisher} (${data.total_episodes} episodes).`
    };
  })
  .build();
