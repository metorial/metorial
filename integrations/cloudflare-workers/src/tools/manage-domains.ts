import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let domainSchema = z.object({
  domainId: z.string().describe('Domain record UUID'),
  hostname: z.string().describe('Hostname attached to the Worker'),
  service: z.string().describe('Worker script name'),
  zoneId: z.string().optional().describe('Zone UUID'),
  zoneName: z.string().optional().describe('Zone name (e.g. example.com)'),
  environment: z.string().optional().describe('Worker environment')
});

export let listDomains = SlateTool.create(spec, {
  name: 'List Worker Domains',
  key: 'list_domains',
  description: `List all custom domains attached to Workers in the account. Each domain maps a hostname on a Cloudflare zone to a specific Worker.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z.array(domainSchema).describe('List of Worker domain attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let domains = await client.listDomains();

    let mapped = (domains || []).map((d: any) => ({
      domainId: d.id,
      hostname: d.hostname,
      service: d.service,
      zoneId: d.zone_id,
      zoneName: d.zone_name,
      environment: d.environment
    }));

    return {
      output: { domains: mapped },
      message: `Found **${mapped.length}** Worker domain(s).`
    };
  })
  .build();

export let getDomain = SlateTool.create(spec, {
  name: 'Get Worker Domain',
  key: 'get_domain',
  description: `Retrieve a specific custom domain attachment for a Worker.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('Domain record UUID to retrieve')
    })
  )
  .output(domainSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getDomain(ctx.input.domainId);

    return {
      output: {
        domainId: result.id,
        hostname: result.hostname,
        service: result.service,
        zoneId: result.zone_id,
        zoneName: result.zone_name,
        environment: result.environment
      },
      message: `Retrieved Worker domain **${ctx.input.domainId}**.`
    };
  })
  .build();

export let attachDomain = SlateTool.create(spec, {
  name: 'Attach Worker Domain',
  key: 'attach_domain',
  description: `Attach a Worker to a custom domain (hostname) on a Cloudflare zone. The Worker will handle requests to that hostname.`
})
  .input(
    z.object({
      hostname: z.string().describe('Hostname to attach (e.g. api.example.com)'),
      scriptName: z.string().describe('Worker script name to route traffic to'),
      zoneId: z.string().describe('Cloudflare Zone ID where the hostname is managed'),
      environment: z
        .string()
        .optional()
        .describe('Worker environment (defaults to production)')
    })
  )
  .output(domainSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.attachDomain(
      ctx.input.hostname,
      ctx.input.scriptName,
      ctx.input.zoneId,
      ctx.input.environment
    );

    return {
      output: {
        domainId: result.id,
        hostname: result.hostname,
        service: result.service,
        zoneId: result.zone_id,
        zoneName: result.zone_name,
        environment: result.environment
      },
      message: `Attached Worker **${ctx.input.scriptName}** to domain **${ctx.input.hostname}**.`
    };
  })
  .build();

export let detachDomain = SlateTool.create(spec, {
  name: 'Detach Worker Domain',
  key: 'detach_domain',
  description: `Detach a Worker from a custom domain. The Worker will no longer handle requests to that hostname.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('Domain record UUID to detach')
    })
  )
  .output(
    z.object({
      detached: z.boolean().describe('Whether the detachment was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.detachDomain(ctx.input.domainId);

    return {
      output: { detached: true },
      message: `Domain **${ctx.input.domainId}** has been detached from its Worker.`
    };
  })
  .build();
