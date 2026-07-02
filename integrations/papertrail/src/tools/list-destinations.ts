import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let destinationSchema = z.object({
  destinationId: z.number().describe('Unique destination ID'),
  description: z.string().optional().describe('Description of the log destination'),
  syslogHostname: z.string().optional().describe('Syslog hostname for sending logs'),
  syslogPort: z.number().optional().describe('Syslog port for sending logs'),
  filter: z.string().nullable().optional().describe('Log filter applied to this destination')
});

export let listDestinations = SlateTool.create(spec, {
  name: 'List Log Destinations',
  key: 'list_destinations',
  description: `List all log destinations configured in Papertrail. Log destinations define where systems should send their logs. Destinations can accept logs via syslog (TCP/UDP/TLS) or HTTPS.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      destinations: z.array(destinationSchema).describe('Array of log destinations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listDestinations();

    let destinations = (Array.isArray(data) ? data : []).map((d: any) => ({
      destinationId: d.id,
      description: d.description,
      syslogHostname: d.syslog?.hostname,
      syslogPort: d.syslog?.port,
      filter: d.filter ?? null
    }));

    return {
      output: { destinations },
      message: `Found **${destinations.length}** log destination(s).`
    };
  })
  .build();
