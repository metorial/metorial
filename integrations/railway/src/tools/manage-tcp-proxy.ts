import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tcpProxyOutputSchema = z.object({
  tcpProxyId: z.string().describe('TCP proxy ID'),
  domain: z.string().nullable().describe('Railway TCP proxy domain'),
  proxyPort: z.number().nullable().describe('External proxy port'),
  applicationPort: z.number().nullable().describe('Application port on the service'),
  serviceId: z.string().describe('Service ID'),
  environmentId: z.string().describe('Environment ID'),
  syncStatus: z.string().nullable().describe('Railway sync status'),
  createdAt: z.string().nullable().describe('Creation timestamp')
});

let mapTcpProxy = (proxy: any) => ({
  tcpProxyId: proxy.id,
  domain: proxy.domain ?? null,
  proxyPort: proxy.proxyPort ?? null,
  applicationPort: proxy.applicationPort ?? null,
  serviceId: proxy.serviceId,
  environmentId: proxy.environmentId,
  syncStatus: proxy.syncStatus ?? null,
  createdAt: proxy.createdAt ?? null
});

export let getTcpProxiesTool = SlateTool.create(spec, {
  name: 'Get TCP Proxies',
  key: 'get_tcp_proxies',
  description: `List TCP proxies configured for a Railway service in an environment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      environmentId: z.string().describe('ID of the environment')
    })
  )
  .output(
    z.object({
      tcpProxies: z.array(tcpProxyOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let proxies = await client.getTcpProxies(ctx.input.serviceId, ctx.input.environmentId);
    let mapped = (proxies || []).map(mapTcpProxy);

    return {
      output: { tcpProxies: mapped },
      message: `Found **${mapped.length}** TCP proxy/proxies.`
    };
  })
  .build();

export let createTcpProxyTool = SlateTool.create(spec, {
  name: 'Create TCP Proxy',
  key: 'create_tcp_proxy',
  description: `Create a public TCP proxy for a Railway service instance.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      environmentId: z.string().describe('ID of the environment'),
      applicationPort: z.number().describe('Port exposed by the service container')
    })
  )
  .output(tcpProxyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let proxy = await client.createTcpProxy({
      serviceId: ctx.input.serviceId,
      environmentId: ctx.input.environmentId,
      applicationPort: ctx.input.applicationPort
    });

    let mapped = mapTcpProxy(proxy);

    return {
      output: mapped,
      message: `Created TCP proxy **${mapped.tcpProxyId}**.`
    };
  })
  .build();

export let deleteTcpProxyTool = SlateTool.create(spec, {
  name: 'Delete TCP Proxy',
  key: 'delete_tcp_proxy',
  description: `Delete a Railway TCP proxy.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tcpProxyId: z.string().describe('ID of the TCP proxy to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the TCP proxy was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    await client.deleteTcpProxy(ctx.input.tcpProxyId);

    return {
      output: { deleted: true },
      message: `TCP proxy deleted successfully.`
    };
  })
  .build();
