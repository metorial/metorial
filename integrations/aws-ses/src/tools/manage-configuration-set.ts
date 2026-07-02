import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let manageConfigurationSet = SlateTool.create(spec, {
  name: 'Manage Configuration Set',
  key: 'manage_configuration_set',
  description: `Create, retrieve, delete, or list SES configuration sets. Configuration sets control delivery options, reputation monitoring, click/open tracking, and suppression behavior for emails. You can also update individual options (sending, reputation, tracking, suppression) on an existing set.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'delete',
          'list',
          'updateSending',
          'updateReputation',
          'updateTracking',
          'updateSuppression'
        ])
        .describe('Operation to perform'),
      configurationSetName: z
        .string()
        .optional()
        .describe('Configuration set name (required for all except "list")'),
      sendingEnabled: z
        .boolean()
        .optional()
        .describe('Enable/disable sending (for create or updateSending)'),
      reputationMetricsEnabled: z
        .boolean()
        .optional()
        .describe('Enable/disable reputation metrics (for create or updateReputation)'),
      customRedirectDomain: z
        .string()
        .optional()
        .describe('Custom domain for tracking redirects (for create or updateTracking)'),
      suppressedReasons: z
        .array(z.enum(['BOUNCE', 'COMPLAINT']))
        .optional()
        .describe('Suppression reasons (for create or updateSuppression)'),
      sendingPoolName: z.string().optional().describe('Dedicated IP pool name for delivery'),
      tlsPolicy: z
        .enum(['REQUIRE', 'OPTIONAL'])
        .optional()
        .describe('TLS policy for email delivery'),
      nextToken: z.string().optional().describe('Pagination token for "list"'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      configurationSetName: z.string().optional(),
      deliveryOptions: z
        .object({
          sendingPoolName: z.string().optional(),
          tlsPolicy: z.string().optional()
        })
        .optional(),
      reputationOptions: z
        .object({
          reputationMetricsEnabled: z.boolean().optional(),
          lastFreshStart: z.string().optional()
        })
        .optional(),
      sendingOptions: z
        .object({
          sendingEnabled: z.boolean().optional()
        })
        .optional(),
      trackingOptions: z
        .object({
          customRedirectDomain: z.string().optional()
        })
        .optional(),
      suppressionOptions: z
        .object({
          suppressedReasons: z.array(z.string()).optional()
        })
        .optional(),
      configurationSets: z
        .array(z.string())
        .optional()
        .describe('List of configuration set names'),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      await client.createConfigurationSet({
        configurationSetName: ctx.input.configurationSetName!,
        deliveryOptions:
          ctx.input.sendingPoolName || ctx.input.tlsPolicy
            ? { sendingPoolName: ctx.input.sendingPoolName, tlsPolicy: ctx.input.tlsPolicy }
            : undefined,
        reputationOptions:
          ctx.input.reputationMetricsEnabled !== undefined
            ? { reputationMetricsEnabled: ctx.input.reputationMetricsEnabled }
            : undefined,
        sendingOptions:
          ctx.input.sendingEnabled !== undefined
            ? { sendingEnabled: ctx.input.sendingEnabled }
            : undefined,
        trackingOptions: ctx.input.customRedirectDomain
          ? { customRedirectDomain: ctx.input.customRedirectDomain }
          : undefined,
        suppressionOptions: ctx.input.suppressedReasons
          ? { suppressedReasons: ctx.input.suppressedReasons }
          : undefined
      });
      return {
        output: { configurationSetName: ctx.input.configurationSetName },
        message: `Configuration set **${ctx.input.configurationSetName}** created.`
      };
    }

    if (action === 'get') {
      let result = await client.getConfigurationSet(ctx.input.configurationSetName!);
      return {
        output: result,
        message: `Retrieved configuration set **${result.configurationSetName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteConfigurationSet(ctx.input.configurationSetName!);
      return {
        output: { configurationSetName: ctx.input.configurationSetName },
        message: `Configuration set **${ctx.input.configurationSetName}** deleted.`
      };
    }

    if (action === 'list') {
      let result = await client.listConfigurationSets({
        nextToken: ctx.input.nextToken,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          configurationSets: result.configurationSets,
          nextToken: result.nextToken
        },
        message: `Found **${result.configurationSets.length}** configuration set(s).${result.nextToken ? ' More results available.' : ''}`
      };
    }

    if (action === 'updateSending') {
      await client.putConfigurationSetSendingOptions(
        ctx.input.configurationSetName!,
        ctx.input.sendingEnabled ?? true
      );
      return {
        output: { configurationSetName: ctx.input.configurationSetName },
        message: `Sending ${ctx.input.sendingEnabled ? 'enabled' : 'disabled'} for **${ctx.input.configurationSetName}**.`
      };
    }

    if (action === 'updateReputation') {
      await client.putConfigurationSetReputationOptions(
        ctx.input.configurationSetName!,
        ctx.input.reputationMetricsEnabled ?? true
      );
      return {
        output: { configurationSetName: ctx.input.configurationSetName },
        message: `Reputation metrics ${ctx.input.reputationMetricsEnabled ? 'enabled' : 'disabled'} for **${ctx.input.configurationSetName}**.`
      };
    }

    if (action === 'updateTracking') {
      await client.putConfigurationSetTrackingOptions(
        ctx.input.configurationSetName!,
        ctx.input.customRedirectDomain
      );
      return {
        output: { configurationSetName: ctx.input.configurationSetName },
        message: `Tracking options updated for **${ctx.input.configurationSetName}**.`
      };
    }

    if (action === 'updateSuppression') {
      await client.putConfigurationSetSuppressionOptions(
        ctx.input.configurationSetName!,
        ctx.input.suppressedReasons
      );
      return {
        output: { configurationSetName: ctx.input.configurationSetName },
        message: `Suppression options updated for **${ctx.input.configurationSetName}**.`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();
