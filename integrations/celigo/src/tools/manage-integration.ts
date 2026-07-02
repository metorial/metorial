import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageIntegration = SlateTool.create(spec, {
  name: 'Manage Integration',
  key: 'manage_integration',
  description: `Get, create, update, clone, or delete an integration. Integrations are organizational containers for flows, connections, and other resources.
Use **action** to specify the operation. For "create" and "update", provide the integration configuration in **integrationData**.`
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'clone', 'delete'])
        .describe('The operation to perform'),
      integrationId: z
        .string()
        .optional()
        .describe('ID of the integration (required for get, update, clone, delete)'),
      integrationData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Integration configuration data (required for create and update)')
    })
  )
  .output(
    z.object({
      integrationId: z.string().optional().describe('ID of the affected integration'),
      name: z.string().optional().describe('Name of the integration'),
      deleted: z.boolean().optional().describe('Whether the integration was deleted'),
      rawResult: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, integrationId, integrationData } = ctx.input;

    if (action !== 'create' && !integrationId) {
      throw new Error('integrationId is required for this action');
    }

    let result: any;
    let message: string;

    switch (action) {
      case 'get': {
        result = await client.getIntegration(integrationId!);
        message = `Retrieved integration **${result.name || result._id}**.`;
        break;
      }
      case 'create': {
        if (!integrationData) throw new Error('integrationData is required for create');
        result = await client.createIntegration(integrationData);
        message = `Created integration **${result.name || result._id}**.`;
        break;
      }
      case 'update': {
        if (!integrationData) throw new Error('integrationData is required for update');
        result = await client.updateIntegration(integrationId!, integrationData);
        message = `Updated integration **${result.name || result._id}**.`;
        break;
      }
      case 'clone': {
        result = await client.cloneIntegration(integrationId!);
        message = `Cloned integration **${integrationId}** → new integration **${result._id}**.`;
        break;
      }
      case 'delete': {
        await client.deleteIntegration(integrationId!);
        return {
          output: {
            integrationId: integrationId!,
            deleted: true
          },
          message: `Deleted integration **${integrationId}**.`
        };
      }
    }

    return {
      output: {
        integrationId: result?._id || integrationId,
        name: result?.name,
        rawResult: result
      },
      message
    };
  })
  .build();
