import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getServer = SlateTool.create(spec, {
  name: 'Get Server',
  key: 'get_server',
  description: `Retrieve your Postmark server's configuration and settings including name, color, SMTP status, tracking preferences, webhook URLs, and inbound settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      serverId: z.number().describe('Server ID.'),
      name: z.string().describe('Server name.'),
      color: z.string().describe('Server color for the UI.'),
      smtpApiActivated: z.boolean().describe('Whether SMTP API is activated.'),
      trackOpens: z.boolean().describe('Whether open tracking is enabled.'),
      trackLinks: z.string().describe('Link tracking mode.'),
      inboundDomain: z.string().describe('Inbound email domain.'),
      inboundSpamThreshold: z.number().describe('Inbound spam threshold score.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    let server = await client.getServer();

    return {
      output: {
        serverId: server.ID,
        name: server.Name,
        color: server.Color || '',
        smtpApiActivated: server.SmtpApiActivated,
        trackOpens: server.TrackOpens,
        trackLinks: server.TrackLinks || 'None',
        inboundDomain: server.InboundDomain || '',
        inboundSpamThreshold: server.InboundSpamThreshold || 0
      },
      message: `Server **${server.Name}** (ID: ${server.ID}). SMTP: ${server.SmtpApiActivated ? 'active' : 'inactive'}, Open tracking: ${server.TrackOpens ? 'on' : 'off'}, Link tracking: ${server.TrackLinks || 'None'}.`
    };
  });
