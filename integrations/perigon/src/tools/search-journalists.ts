import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { spec } from '../spec';

let journalistSchema = z.object({
  journalistId: z.string().describe('Unique journalist identifier (UUID)'),
  name: z.string().describe('Journalist name'),
  title: z.string().describe('Professional title'),
  bio: z.string().describe('Biography'),
  twitterHandle: z.string().describe('Twitter/X handle'),
  location: z.string().describe('Location'),
  avgMonthlyPosts: z.number().describe('Average number of articles per month'),
  topSources: z
    .array(
      z.object({
        name: z.string(),
        domain: z.string(),
        count: z.number()
      })
    )
    .describe('Most frequent publications'),
  topCategories: z
    .array(
      z.object({
        name: z.string(),
        count: z.number()
      })
    )
    .describe('Most covered categories'),
  topTopics: z
    .array(
      z.object({
        name: z.string(),
        count: z.number()
      })
    )
    .describe('Most covered topics'),
  topCountries: z
    .array(
      z.object({
        name: z.string(),
        count: z.number()
      })
    )
    .describe('Most covered countries')
});

export let searchJournalists = SlateTool.create(spec, {
  name: 'Search Journalists',
  key: 'search_journalists',
  description: `Search Perigon's database of 230,000+ journalist and reporter profiles. Returns journalist details including bio, publications, coverage areas, and publishing activity. Use this to find journalists covering specific topics or writing for specific publications.`,
  instructions: ['The journalistId can be found in article responses under matchedAuthors'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Journalist name to search'),
      journalistId: z
        .string()
        .optional()
        .describe('Look up a specific journalist by their UUID (from article matchedAuthors)'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      numResults: z.number().describe('Total number of matching journalists'),
      journalists: z.array(journalistSchema).describe('List of matching journalists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    // If a specific journalist ID is provided, fetch directly
    if (ctx.input.journalistId) {
      let detail = await client.getJournalistById(ctx.input.journalistId);
      let journalist = {
        journalistId: detail.id || '',
        name: detail.name || '',
        title: detail.title || '',
        bio: detail.bio || '',
        twitterHandle: detail.twitterHandle || '',
        location: detail.location || '',
        avgMonthlyPosts: detail.avgMonthlyPosts || 0,
        topSources: detail.topSources || [],
        topCategories: detail.topCategories || [],
        topTopics: detail.topTopics || [],
        topCountries: detail.topCountries || []
      };

      return {
        output: {
          numResults: 1,
          journalists: [journalist]
        },
        message: `Found journalist **${journalist.name}**.`
      };
    }

    let result = await client.searchJournalists({
      name: ctx.input.name,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let journalists = (result.results || []).map(j => ({
      journalistId: j.id || '',
      name: j.name || '',
      title: j.title || '',
      bio: j.bio || '',
      twitterHandle: j.twitterHandle || '',
      location: j.location || '',
      avgMonthlyPosts: j.avgMonthlyPosts || 0,
      topSources: j.topSources || [],
      topCategories: j.topCategories || [],
      topTopics: j.topTopics || [],
      topCountries: j.topCountries || []
    }));

    return {
      output: {
        numResults: result.numResults || 0,
        journalists
      },
      message: `Found **${result.numResults || 0}** journalists (showing ${journalists.length}).`
    };
  })
  .build();
