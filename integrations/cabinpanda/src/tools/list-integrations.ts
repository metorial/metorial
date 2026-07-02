import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let listIntegrations = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description: `Retrieve all integrations configured on the account. Integrations connect form submissions to external services like webhooks and third-party apps.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      integrations: z
        .array(
          z.object({
            integrationId: z
              .string()
              .optional()
              .describe('Unique identifier for the integration'),
            name: z.string().optional().describe('Name of the integration'),
            type: z.string().optional().describe('Type of integration'),
            formId: z
              .string()
              .optional()
              .describe('ID of the form this integration is connected to'),
            status: z.string().optional().describe('Current status of the integration'),
            raw: z.any().optional().describe('Full integration object from the API')
          })
        )
        .describe('List of integrations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let integrations = await client.listIntegrations();

    let mappedIntegrations = (Array.isArray(integrations) ? integrations : []).map(
      (integ: any) => ({
        integrationId: integ?.id?.toString(),
        name: integ?.name,
        type: integ?.type,
        formId: integ?.form_id?.toString() ?? integ?.form_key,
        status: integ?.status,
        raw: integ
      })
    );

    return {
      output: { integrations: mappedIntegrations },
      message: `Found **${mappedIntegrations.length}** integration(s).`
    };
  })
  .build();
