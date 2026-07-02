import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

let organicResultSchema = z.object({
  position: z.number().optional().describe('Position in search results'),
  title: z.string().optional().describe('Title of the result'),
  link: z.string().optional().describe('URL of the result'),
  displayedLink: z.string().optional().describe('Displayed URL'),
  snippet: z.string().optional().describe('Text snippet from the result'),
  cachedPageLink: z.string().optional().describe('Link to cached version'),
  source: z.string().optional().describe('Source name')
});

let answerBoxSchema = z
  .object({
    type: z.string().optional().describe('Type of answer box'),
    title: z.string().optional().describe('Title of the answer'),
    answer: z.string().optional().describe('Direct answer text'),
    snippet: z.string().optional().describe('Snippet text'),
    link: z.string().optional().describe('Source URL')
  })
  .optional();

let knowledgeGraphSchema = z
  .object({
    title: z.string().optional().describe('Knowledge graph title'),
    type: z.string().optional().describe('Entity type'),
    description: z.string().optional().describe('Entity description'),
    source: z.any().optional().describe('Source information'),
    imageUrl: z.string().optional().describe('Image URL')
  })
  .optional();

let relatedSearchSchema = z.object({
  query: z.string().optional().describe('Related search query'),
  link: z.string().optional().describe('Link to related search')
});

let relatedQuestionSchema = z.object({
  question: z.string().optional().describe('People also ask question'),
  snippet: z.string().optional().describe('Answer snippet'),
  title: z.string().optional().describe('Source title'),
  link: z.string().optional().describe('Source link')
});

export let webSearchTool = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Search the web using Google, Bing, DuckDuckGo, Yahoo, Yandex, Baidu, or Naver. Returns structured results including organic listings, answer boxes, knowledge graphs, related questions, and related searches. Useful for general web queries, research, and information retrieval.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      engine: z
        .enum(['google', 'bing', 'duckduckgo', 'yahoo', 'yandex', 'baidu', 'naver'])
        .default('google')
        .describe('Search engine to use'),
      location: z
        .string()
        .optional()
        .describe('Location to simulate search from (e.g., "Austin, Texas")'),
      language: z.string().optional().describe('Language code (e.g., "en", "es", "fr")'),
      country: z.string().optional().describe('Country code (e.g., "us", "uk", "fr")'),
      numResults: z.number().optional().describe('Number of results to return per page'),
      page: z
        .number()
        .optional()
        .describe('Page number (0-indexed offset for Google, 1-indexed for others)'),
      device: z
        .enum(['desktop', 'tablet', 'mobile'])
        .optional()
        .describe('Device type to emulate'),
      safeSearch: z.boolean().optional().describe('Enable safe search filtering'),
      dateRange: z
        .string()
        .optional()
        .describe(
          'Date range filter (e.g., "d" for past day, "w" for past week, "m" for past month, "y" for past year)'
        ),
      noCache: z.boolean().optional().describe('Force fresh results instead of cached')
    })
  )
  .output(
    z.object({
      searchMetadata: z
        .object({
          searchId: z.string().optional().describe('Unique search identifier'),
          status: z.string().optional().describe('Search status'),
          totalResults: z.number().optional().describe('Total number of results found'),
          timeTaken: z
            .number()
            .optional()
            .describe('Time taken to process the search in seconds')
        })
        .optional(),
      organicResults: z.array(organicResultSchema).describe('Organic search results'),
      answerBox: answerBoxSchema.describe('Direct answer box if present'),
      knowledgeGraph: knowledgeGraphSchema.describe('Knowledge graph panel if present'),
      relatedSearches: z
        .array(relatedSearchSchema)
        .optional()
        .describe('Related search suggestions'),
      relatedQuestions: z
        .array(relatedQuestionSchema)
        .optional()
        .describe('People also ask questions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let params: Record<string, any> = {
      engine: ctx.input.engine,
      q: ctx.input.query
    };

    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.language) params.hl = ctx.input.language;
    if (ctx.input.country) params.gl = ctx.input.country;
    if (ctx.input.numResults) params.num = ctx.input.numResults;
    if (ctx.input.device) params.device = ctx.input.device;
    if (ctx.input.noCache) params.no_cache = ctx.input.noCache;
    if (ctx.input.safeSearch !== undefined)
      params.safe = ctx.input.safeSearch ? 'active' : 'off';
    if (ctx.input.dateRange) params.as_qdr = ctx.input.dateRange;

    if (ctx.input.page !== undefined) {
      if (ctx.input.engine === 'google') {
        params.start = ctx.input.page * (ctx.input.numResults || 10);
      } else if (ctx.input.engine === 'bing') {
        params.first = ctx.input.page * 10;
      }
    }

    let data = await client.search(params);

    let organicResults = (data.organic_results || []).map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      displayedLink: r.displayed_link,
      snippet: r.snippet,
      cachedPageLink: r.cached_page_link,
      source: r.source
    }));

    let answerBox = data.answer_box
      ? {
          type: data.answer_box.type,
          title: data.answer_box.title,
          answer: data.answer_box.answer || data.answer_box.result,
          snippet: data.answer_box.snippet,
          link: data.answer_box.link
        }
      : undefined;

    let knowledgeGraph = data.knowledge_graph
      ? {
          title: data.knowledge_graph.title,
          type: data.knowledge_graph.type,
          description: data.knowledge_graph.description,
          source: data.knowledge_graph.source,
          imageUrl: data.knowledge_graph.header_images?.[0]?.image
        }
      : undefined;

    let relatedSearches = (data.related_searches || []).map((r: any) => ({
      query: r.query,
      link: r.link
    }));

    let relatedQuestions = (data.related_questions || []).map((r: any) => ({
      question: r.question,
      snippet: r.snippet,
      title: r.title,
      link: r.link
    }));

    let totalResults = data.search_information?.total_results;

    return {
      output: {
        searchMetadata: {
          searchId: data.search_metadata?.id,
          status: data.search_metadata?.status,
          totalResults: totalResults,
          timeTaken: data.search_metadata?.total_time_taken
        },
        organicResults,
        answerBox,
        knowledgeGraph,
        relatedSearches,
        relatedQuestions
      },
      message: `Web search for "${ctx.input.query}" on ${ctx.input.engine} returned **${organicResults.length}** organic results${totalResults ? ` (out of ~${totalResults} total)` : ''}.${answerBox ? ' An answer box was found.' : ''}${knowledgeGraph ? ` Knowledge graph: "${knowledgeGraph.title}".` : ''}`
    };
  })
  .build();
