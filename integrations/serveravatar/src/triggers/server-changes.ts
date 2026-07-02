import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let serverChanges = SlateTrigger.create(spec, {
  name: 'Server Changes',
  key: 'server_changes',
  description:
    'Polls for changes to servers in an organization, detecting new servers, removed servers, and status changes (e.g. agent_status, ssh_status, ip changes).'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'removed', 'updated']).describe('Type of change detected'),
      serverId: z.string().describe('Server ID'),
      serverName: z.string().describe('Server name'),
      serverIp: z.string().optional().describe('Server IP address'),
      provider: z.string().optional().describe('Cloud provider name'),
      agentStatus: z.string().optional().describe('Server agent status'),
      webServer: z.string().optional().describe('Web server type'),
      changedFields: z
        .array(z.string())
        .optional()
        .describe('List of fields that changed (for updated events)')
    })
  )
  .output(
    z.object({
      serverId: z.string().describe('Server ID'),
      serverName: z.string().describe('Server name'),
      serverIp: z.string().optional().describe('Server IP address'),
      provider: z.string().optional().describe('Cloud provider name'),
      agentStatus: z.string().optional().describe('Server agent status'),
      webServer: z.string().optional().describe('Web server type'),
      changedFields: z.array(z.string()).optional().describe('Fields that changed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ServerAvatarClient({ token: ctx.auth.token });
      let orgId = ctx.config.organizationId;
      if (!orgId) return { inputs: [], updatedState: ctx.state };

      let result = await client.listServers(orgId);
      let currentServers = result.servers;

      let previousServerMap: Record<string, Record<string, unknown>> = (ctx.state
        ?.serverMap as Record<string, Record<string, unknown>>) || {};
      let currentServerMap: Record<string, Record<string, unknown>> = {};
      let inputs: Array<{
        eventType: 'created' | 'removed' | 'updated';
        serverId: string;
        serverName: string;
        serverIp?: string;
        provider?: string;
        agentStatus?: string;
        webServer?: string;
        changedFields?: string[];
      }> = [];

      for (let server of currentServers) {
        let id = String(server.id);
        currentServerMap[id] = {
          name: server.name,
          ip: server.ip,
          provider_name: server.provider_name,
          agent_status: server.agent_status,
          web_server: server.web_server
        };

        let prev = previousServerMap[id];
        if (!prev) {
          inputs.push({
            eventType: 'created',
            serverId: id,
            serverName: (server.name as string) || '',
            serverIp: server.ip as string | undefined,
            provider: server.provider_name as string | undefined,
            agentStatus: server.agent_status as string | undefined,
            webServer: server.web_server as string | undefined
          });
        } else {
          let trackedFields = [
            'name',
            'ip',
            'provider_name',
            'agent_status',
            'web_server'
          ] as const;
          let changedFields: string[] = [];
          for (let field of trackedFields) {
            if (String(prev[field] ?? '') !== String(currentServerMap[id][field] ?? '')) {
              changedFields.push(field);
            }
          }
          if (changedFields.length > 0) {
            inputs.push({
              eventType: 'updated',
              serverId: id,
              serverName: (server.name as string) || '',
              serverIp: server.ip as string | undefined,
              provider: server.provider_name as string | undefined,
              agentStatus: server.agent_status as string | undefined,
              webServer: server.web_server as string | undefined,
              changedFields
            });
          }
        }
      }

      let currentIds = new Set(Object.keys(currentServerMap));
      for (let prevId of Object.keys(previousServerMap)) {
        if (!currentIds.has(prevId)) {
          let prevServer = previousServerMap[prevId];
          if (!prevServer) continue;
          inputs.push({
            eventType: 'removed',
            serverId: prevId,
            serverName: (prevServer.name as string) || '',
            serverIp: prevServer.ip as string | undefined,
            provider: prevServer.provider_name as string | undefined,
            agentStatus: undefined,
            webServer: prevServer.web_server as string | undefined
          });
        }
      }

      return {
        inputs,
        updatedState: {
          serverMap: currentServerMap,
          lastPolled: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let { eventType, serverId } = ctx.input;
      let timestamp = new Date().toISOString();

      return {
        type: `server.${eventType}`,
        id: `server_${serverId}_${eventType}_${timestamp}`,
        output: {
          serverId: ctx.input.serverId,
          serverName: ctx.input.serverName,
          serverIp: ctx.input.serverIp,
          provider: ctx.input.provider,
          agentStatus: ctx.input.agentStatus,
          webServer: ctx.input.webServer,
          changedFields: ctx.input.changedFields
        }
      };
    }
  })
  .build();
