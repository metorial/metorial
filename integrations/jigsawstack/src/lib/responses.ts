import { z } from 'zod';

let base = z.object({ success: z.boolean() }).passthrough();
let vector = z.array(z.array(z.number()));
let segment = z
  .object({ text: z.string().optional(), timestamp: z.array(z.number()).optional() })
  .passthrough();

export let responses = {
  scrape: base.extend({
    data: z
      .array(
        z
          .object({
            key: z.string().optional(),
            selector: z.string().optional(),
            results: z.array(z.unknown()).optional()
          })
          .passthrough()
      )
      .optional(),
    context: z.record(z.string(), z.array(z.string())).optional(),
    selectors: z.record(z.string(), z.array(z.string())).optional(),
    page_position: z.number().optional(),
    page_position_length: z.number().optional(),
    meta: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.string().optional(),
        og_image: z.string().optional()
      })
      .passthrough()
      .optional(),
    link: z.array(z.unknown()).optional()
  }),
  search: base.extend({
    query: z.string(),
    ai_overview: z.string().optional(),
    spell_fixed: z.boolean().optional(),
    is_safe: z.boolean().optional(),
    results: z.array(
      z
        .object({
          title: z.string().optional(),
          url: z.string().optional(),
          description: z.string().optional(),
          content: z
            .union([z.string(), z.record(z.string(), z.unknown())])
            .nullable()
            .optional(),
          is_safe: z.boolean().optional(),
          site_name: z.string().optional(),
          site_long_name: z.string().optional(),
          age: z.string().optional(),
          language: z.string().optional(),
          favicon: z.string().optional(),
          snippets: z.array(z.string()).optional(),
          related_index: z.unknown().optional()
        })
        .passthrough()
    ),
    image_urls: z.array(z.string()).optional(),
    links: z.array(z.string()).optional(),
    geo_results: z.array(z.unknown()).optional()
  }),
  sentiment: base.extend({
    sentiment: z
      .object({
        emotion: z.string(),
        sentiment: z.string(),
        score: z.number(),
        sentences: z
          .array(
            z
              .object({
                text: z.string(),
                emotion: z.string(),
                sentiment: z.string(),
                score: z.number()
              })
              .passthrough()
          )
          .optional()
      })
      .passthrough()
  }),
  translation: base.extend({ translated_text: z.union([z.string(), z.array(z.string())]) }),
  summary: base.extend({ summary: z.union([z.string(), z.array(z.string())]) }),
  vision: base.extend({
    context: z.unknown(),
    width: z.number().optional(),
    height: z.number().optional(),
    tags: z.array(z.string()).optional(),
    has_text: z.boolean().optional(),
    sections: z
      .array(
        z
          .object({ text: z.string().optional(), lines: z.array(z.unknown()).optional() })
          .passthrough()
      )
      .optional(),
    total_pages: z.number().optional(),
    page_range: z.array(z.number()).optional()
  }),
  transcription: base.extend({
    text: z.string().optional(),
    chunks: z.array(segment).optional(),
    speakers: z.array(segment.extend({ speaker: z.string().optional() })).optional(),
    language_detected: z.string().optional(),
    confidence: z.number().optional(),
    status: z.string().optional(),
    id: z.string().optional()
  }),
  fileUrl: base.extend({ url: z.string() }),
  sql: base.extend({ sql: z.string() }),
  spelling: base.extend({
    misspellings_found: z.boolean(),
    misspellings: z
      .array(
        z
          .object({
            word: z.string().nullable(),
            startIndex: z.number(),
            endIndex: z.number(),
            expected: z.array(z.string()),
            auto_corrected: z.boolean().optional()
          })
          .passthrough()
      )
      .optional(),
    auto_correct_text: z.string().optional()
  }),
  profanity: base.extend({
    profanities_found: z.boolean(),
    profanities: z
      .array(
        z
          .object({
            profanity: z.string().nullable(),
            startIndex: z.number(),
            endIndex: z.number()
          })
          .passthrough()
      )
      .optional(),
    clean_text: z.string().optional()
  }),
  spam: base.extend({
    check: z.union([
      z.object({ is_spam: z.boolean(), score: z.number() }).passthrough(),
      z.array(z.object({ is_spam: z.boolean(), score: z.number() }).passthrough()).min(1)
    ])
  }),
  nsfw: base.extend({
    nsfw: z.boolean(),
    nudity: z.boolean(),
    gore: z.boolean(),
    nsfw_score: z.number(),
    nudity_score: z.number(),
    gore_score: z.number()
  }),
  objects: base.extend({
    objects: z
      .array(
        z
          .object({
            label: z.string().optional(),
            bounds: z.unknown().optional(),
            mask: z.string().optional()
          })
          .passthrough()
      )
      .optional(),
    gui_elements: z
      .array(
        z
          .object({
            content: z.string().nullable().optional(),
            bounds: z.unknown().optional()
          })
          .passthrough()
      )
      .optional(),
    tags: z.array(z.string()).optional(),
    annotated_image: z.string().optional()
  }),
  prediction: base.extend({
    prediction: z.array(z.object({ date: z.string(), value: z.number() }).passthrough()),
    steps: z.number()
  }),
  embedding: base.extend({
    embeddings: vector,
    chunks: z.array(z.unknown()).optional(),
    speaker_embeddings: vector.optional()
  }),
  geo: base.extend({
    results: z.array(z.unknown()).optional(),
    data: z.array(z.unknown()).optional()
  }),
  suggestions: base.extend({ suggestions: z.array(z.string()) }),
  classification: base.extend({
    predictions: z.array(z.union([z.string(), z.array(z.string())]))
  }),
  storedFile: base.extend({
    url: z.string(),
    key: z.string(),
    message: z.string().optional()
  }),
  deleted: base
};
