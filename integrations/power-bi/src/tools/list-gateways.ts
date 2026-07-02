import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let datasourceSchema = z.object({
  datasourceId: z.string().describe('Data source ID'),
  datasourceType: z.string().optional().describe('Type of data source'),
  datasourceName: z.string().optional().describe('Name of the data source'),
  connectionDetails: z.string().optional().describe('Connection details'),
  gatewayId: z.string().optional().describe('Gateway ID')
});

let gatewaySchema = z.object({
  gatewayId: z.string().describe('Unique identifier of the gateway'),
  name: z.string().describe('Gateway name'),
  type: z.string().optional().describe('Gateway type'),
  publicKey: z.any().optional().describe('Public key for encryption'),
  datasources: z.array(datasourceSchema).optional().describe('Data sources on this gateway')
});

export let listGateways = SlateTool.create(spec, {
  name: 'List Gateways',
  key: 'list_gateways',
  description: `List on-premises data gateways and optionally include their data sources. View gateway configurations and connected data sources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeDatasources: z
        .boolean()
        .optional()
        .describe('Include data sources for each gateway')
    })
  )
  .output(
    z.object({
      gateways: z.array(gatewaySchema).describe('List of gateways')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let gateways = await client.listGateways();

    let mapped = await Promise.all(
      gateways.map(async (g: any) => {
        let gateway: any = {
          gatewayId: g.id,
          name: g.name,
          type: g.type,
          publicKey: g.publicKey
        };

        if (ctx.input.includeDatasources) {
          try {
            let sources = await client.getGatewayDatasources(g.id);
            gateway.datasources = sources.map((s: any) => ({
              datasourceId: s.id,
              datasourceType: s.datasourceType,
              datasourceName: s.datasourceName,
              connectionDetails: s.connectionDetails
                ? JSON.stringify(s.connectionDetails)
                : undefined,
              gatewayId: s.gatewayId
            }));
          } catch {
            gateway.datasources = [];
          }
        }

        return gateway;
      })
    );

    return {
      output: { gateways: mapped },
      message: `Found **${mapped.length}** gateway(s).`
    };
  })
  .build();
