import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let createAgent = SlateTool.create(spec, {
  name: 'Create Agent',
  key: 'create_agent',
  description: `Create a new AI agent in CustomGPT. An agent is built around a knowledge base that can be sourced from a sitemap URL. Once created, the agent can be configured with custom personas and settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name for the new agent'),
      sitemapPath: z
        .string()
        .optional()
        .describe(
          'Sitemap URL to use as the initial data source (e.g. https://example.com/sitemap.xml)'
        ),
      isOcrEnabled: z
        .boolean()
        .optional()
        .describe('Enable OCR for processing scanned documents'),
      isVisionEnabled: z.boolean().optional().describe('Enable vision processing for images')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the created agent'),
      projectName: z.string().describe('Name of the created agent'),
      sitemapPath: z.string().nullable().describe('Sitemap URL'),
      type: z.string().describe('Agent type'),
      isChatActive: z.boolean().describe('Whether chat is active'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let agent = await client.createAgent({
      projectName: ctx.input.projectName,
      sitemapPath: ctx.input.sitemapPath,
      isOcrEnabled: ctx.input.isOcrEnabled,
      isVisionEnabled: ctx.input.isVisionEnabled
    });

    return {
      output: {
        projectId: agent.projectId,
        projectName: agent.projectName,
        sitemapPath: agent.sitemapPath,
        type: agent.type,
        isChatActive: agent.isChatActive,
        createdAt: agent.createdAt
      },
      message: `Created agent **${agent.projectName}** (ID: ${agent.projectId}).`
    };
  })
  .build();
