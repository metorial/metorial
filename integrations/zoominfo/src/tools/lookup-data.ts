import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, records } from '../lib/client';
import { spec } from '../spec';

export const lookupData = SlateTool.create(spec, {
  name: 'Lookup Data',
  key: 'lookup_data',
  description:
    'Discover accepted filter values for ZoomInfo searches and enrichment, including intent topics, metro regions, news categories, technology products and company industries.',
  constraints: ['Requires a current GTM API connection and one of its Data API scopes.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      fieldName: z
        .enum([
          'board-members',
          'buying-groups',
          'company-rankings',
          'company-types',
          'continents',
          'countries',
          'departments',
          'employee-count',
          'funding-round-types',
          'hashtags',
          'industries',
          'intent-topics',
          'job-functions',
          'job-titles',
          'management-levels',
          'metro-regions',
          'naics-codes',
          'news-categories',
          'revenue-ranges',
          'scoop-departments',
          'scoop-topics',
          'scoop-types',
          'sic-codes',
          'states',
          'sub-unit-types',
          'tech-categories',
          'tech-products',
          'tech-skills',
          'tech-vendors',
          'years-of-experience'
        ])
        .describe('Lookup field name from the current Data API'),
      category: z.string().optional().describe('Hashtag category; applies only to hashtags'),
      parentCategory: z
        .string()
        .optional()
        .describe('Parent category for hashtag or technology lookups'),
      subCategory: z
        .string()
        .optional()
        .describe('Subcategory for hashtag or technology lookups'),
      vendor: z.string().optional().describe('Vendor for hashtag or technology lookups')
    })
  )
  .output(
    z.object({ values: z.array(z.record(z.string(), z.unknown())), returnedCount: z.number() })
  )
  .handleInvocation(async ctx => {
    const { fieldName, ...input } = ctx.input;
    const filters = Object.fromEntries(
      Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [`filter[${key}]`, value])
    );
    const values = records(await Client.fromContext(ctx).lookupData(fieldName, filters));
    return {
      output: { values, returnedCount: values.length },
      message: `Retrieved ${values.length} accepted value(s) for ${fieldName}.`
    };
  })
  .build();
