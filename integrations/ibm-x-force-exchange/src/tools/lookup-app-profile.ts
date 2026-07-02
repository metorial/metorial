import { SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

export let lookupAppProfile = SlateTool.create(spec, {
  name: 'Lookup App Profile',
  key: 'lookup_app_profile',
  description: `Look up the risk profile of an internet application (e.g., Facebook, Instagram, Dropbox). Returns application description, content categories, supported actions, risk factors, and associated URLs.
You can search by exact application name or do a full-text search to discover applications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().optional().describe('Exact application name to look up'),
      searchQuery: z.string().optional().describe('Full-text search for applications')
    })
  )
  .output(
    z.object({
      application: z
        .object({
          name: z.string().optional().describe('Application name'),
          description: z.string().optional().describe('Application description'),
          categories: z.record(z.string(), z.any()).optional().describe('Content categories'),
          riskRating: z.number().optional().describe('Overall risk rating'),
          riskFactors: z.array(z.string()).optional().describe('Identified risk factors'),
          actions: z.array(z.string()).optional().describe('Supported actions'),
          urls: z.array(z.string()).optional().describe('Associated URLs')
        })
        .optional()
        .describe('Application profile (for exact name lookup)'),
      searchResults: z
        .array(
          z.object({
            name: z.string().optional().describe('Application name'),
            description: z.string().optional().describe('Short description'),
            riskRating: z.number().optional().describe('Risk rating'),
            categories: z.record(z.string(), z.any()).optional().describe('Content categories')
          })
        )
        .optional()
        .describe('Search results (for full-text search)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient({
      token: ctx.auth.token,
      password: ctx.auth.password
    });

    if (ctx.input.appName) {
      ctx.progress('Looking up application profile...');
      let data = await client.getAppProfile(ctx.input.appName);
      let app = data.application || data;

      let riskFactors: string[] = [];
      if (app.riskfactors) {
        for (let [key, val] of Object.entries(app.riskfactors)) {
          if (val) riskFactors.push(key);
        }
      }

      return {
        output: {
          application: {
            name: app.name,
            description: app.description || app.desc,
            categories: app.categories,
            riskRating: app.score || app.riskRating,
            riskFactors: riskFactors.length > 0 ? riskFactors : undefined,
            actions: app.actions
              ? Object.keys(app.actions).filter(k => app.actions[k])
              : undefined,
            urls: app.urls
          }
        },
        message: `Application **${app.name || ctx.input.appName}** — risk rating: ${app.score || 'N/A'}`
      };
    }

    if (ctx.input.searchQuery) {
      ctx.progress('Searching applications...');
      let data = await client.searchAppProfiles(ctx.input.searchQuery);
      let rows = data.rows || data || [];

      let results = rows.map((r: any) => ({
        name: r.name,
        description: r.description || r.desc,
        riskRating: r.score || r.riskRating,
        categories: r.categories
      }));

      return {
        output: { searchResults: results },
        message: `Found **${results.length}** application(s) matching "${ctx.input.searchQuery}"`
      };
    }

    throw new Error('Provide either appName or searchQuery');
  })
  .build();
