import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description: `Retrieve detailed information about a specific AI agent, including its configuration, sharing settings, and embed codes. Also retrieves the agent's statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Agent ID'),
      projectName: z.string().describe('Agent name'),
      sitemapPath: z.string().nullable().describe('Sitemap URL'),
      isChatActive: z.boolean().describe('Whether chat is active'),
      type: z.string().describe('Agent type (SITEMAP or URL)'),
      isShared: z.boolean().describe('Whether the agent is publicly shared'),
      shareableLink: z.string().nullable().describe('Public sharing URL'),
      embedCode: z.string().nullable().describe('HTML embed code for the agent'),
      areLicensesAllowed: z.boolean().describe('Whether licenses are enabled'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      stats: z.record(z.string(), z.unknown()).nullable().describe('Agent statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let agent = await client.getAgent(ctx.input.projectId);
    let stats: Record<string, unknown> | null = null;
    try {
      stats = await client.getAgentStats(ctx.input.projectId);
    } catch (_e) {
      // Stats may not be available
    }

    return {
      output: {
        projectId: agent.projectId,
        projectName: agent.projectName,
        sitemapPath: agent.sitemapPath,
        isChatActive: agent.isChatActive,
        type: agent.type,
        isShared: agent.isShared,
        shareableLink: agent.shareableLink,
        embedCode: agent.embedCode,
        areLicensesAllowed: agent.areLicensesAllowed,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        stats
      },
      message: `Agent **${agent.projectName}** (ID: ${agent.projectId}) — Type: ${agent.type}, Active: ${agent.isChatActive}, Shared: ${agent.isShared}.`
    };
  })
  .build();
