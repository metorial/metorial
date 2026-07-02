import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReportConnections = SlateTool.create(spec, {
  name: 'Get Report Connections',
  key: 'get_report_connections',
  description: `Find linked social media accounts across platforms for a given influencer. Discover which other platforms an influencer is active on and retrieve their cross-platform profile connections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z.string().describe('Username or channel name/ID of the influencer'),
      socialNetwork: z
        .enum(['instagram', 'youtube', 'tiktok', 'twitter', 'twitch', 'snapchat'])
        .describe('Source social network platform')
    })
  )
  .output(
    z.object({
      connections: z.any().describe('Linked social accounts across platforms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response = await client.getReportConnections(
      ctx.input.username,
      ctx.input.socialNetwork
    );

    return {
      output: {
        connections: response?.result ?? response
      },
      message: `Retrieved connected accounts for **${ctx.input.username}** on ${ctx.input.socialNetwork}.`
    };
  })
  .build();
