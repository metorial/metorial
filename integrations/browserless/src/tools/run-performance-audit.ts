import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';
import { requireHttpUrl } from './shared';

export let runPerformanceAudit = SlateTool.create(spec, {
  name: 'Run Performance Audit',
  key: 'run_performance_audit',
  description: `Run a Google Lighthouse audit on a web page to analyze performance, accessibility, SEO, best practices, and PWA metrics. Filter by categories or specific audits to reduce response size. Returns audit scores and detailed metrics.`,
  instructions: [
    'Use onlyCategories to limit results to specific areas: performance, accessibility, best-practices, seo, pwa.',
    'Full audits can take several seconds and produce large responses. Filter categories when possible.'
  ],
  constraints: [
    'Full audit responses can be 350-800KB. Use category or audit filtering to reduce size.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the page to audit'),
      onlyCategories: z
        .array(z.enum(['performance', 'accessibility', 'best-practices', 'seo', 'pwa']))
        .optional()
        .describe('Limit audit to specific categories'),
      onlyAudits: z
        .array(z.string())
        .optional()
        .describe(
          'Request only specific audit metrics (e.g., "first-contentful-paint", "speed-index")'
        )
    })
  )
  .output(
    z.object({
      lighthouseVersion: z.string().optional().describe('Lighthouse version used'),
      categories: z
        .record(
          z.string(),
          z.object({
            title: z.string().optional(),
            score: z.number().nullable().optional().describe('Category score from 0 to 1')
          })
        )
        .optional()
        .describe('Category-level scores'),
      audits: z
        .record(
          z.string(),
          z.object({
            title: z.string().optional(),
            score: z.number().nullable().optional().describe('Audit score from 0 to 1'),
            displayValue: z.string().optional().describe('Human-readable value'),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Individual audit results')
    })
  )
  .handleInvocation(async ctx => {
    requireHttpUrl(ctx.input.url);

    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let input = ctx.input;
    let result = await client.runPerformanceAudit({
      url: input.url,
      config:
        input.onlyCategories || input.onlyAudits
          ? {
              extends: 'lighthouse:default',
              settings: {
                onlyCategories: input.onlyCategories,
                onlyAudits: input.onlyAudits
              }
            }
          : undefined
    });

    let data = result?.data ?? result;

    let categories: Record<string, { title?: string; score?: number | null }> = {};
    if (data?.categories) {
      for (let [key, cat] of Object.entries(data.categories as Record<string, any>)) {
        categories[key] = { title: cat?.title, score: cat?.score };
      }
    }

    let audits: Record<
      string,
      { title?: string; score?: number | null; displayValue?: string; description?: string }
    > = {};
    if (data?.audits) {
      for (let [key, audit] of Object.entries(data.audits as Record<string, any>)) {
        audits[key] = {
          title: audit?.title,
          score: audit?.score,
          displayValue: audit?.displayValue,
          description: audit?.description
        };
      }
    }

    let categorySummary = Object.entries(categories)
      .map(
        ([key, cat]) =>
          `${key}: ${cat.score !== null && cat.score !== undefined ? Math.round(cat.score * 100) : 'N/A'}`
      )
      .join(', ');

    return {
      output: {
        lighthouseVersion: data?.lighthouseVersion,
        categories,
        audits
      },
      message: `Lighthouse audit of ${input.url} complete.${categorySummary ? ` Scores: ${categorySummary}.` : ''}`
    };
  })
  .build();
