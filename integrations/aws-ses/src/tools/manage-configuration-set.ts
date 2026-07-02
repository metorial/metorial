import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { requireAwsSesString } from '../lib/errors';
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
          'updateDelivery',
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
      maxDeliverySeconds: z
        .number()
        .optional()
        .describe('Maximum time in seconds SES attempts delivery (300 to 50400)'),
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
          tlsPolicy: z.string().optional(),
          maxDeliverySeconds: z.number().optional()
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
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      await client.createConfigurationSet({
        configurationSetName,
        deliveryOptions:
          ctx.input.sendingPoolName ||
          ctx.input.tlsPolicy ||
          ctx.input.maxDeliverySeconds !== undefined
            ? {
                sendingPoolName: ctx.input.sendingPoolName,
                tlsPolicy: ctx.input.tlsPolicy,
                maxDeliverySeconds: ctx.input.maxDeliverySeconds
              }
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
        output: { configurationSetName },
        message: `Configuration set **${configurationSetName}** created.`
      };
    }

    if (action === 'get') {
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      let result = await client.getConfigurationSet(configurationSetName);
      return {
        output: result,
        message: `Retrieved configuration set **${result.configurationSetName}**.`
      };
    }

    if (action === 'delete') {
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      await client.deleteConfigurationSet(configurationSetName);
      return {
        output: { configurationSetName },
        message: `Configuration set **${configurationSetName}** deleted.`
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

    if (action === 'updateDelivery') {
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      if (
        ctx.input.sendingPoolName === undefined &&
        ctx.input.tlsPolicy === undefined &&
        ctx.input.maxDeliverySeconds === undefined
      ) {
        throw createApiServiceError(
          'sendingPoolName, tlsPolicy, or maxDeliverySeconds is required for "updateDelivery".'
        );
      }
      await client.putConfigurationSetDeliveryOptions(configurationSetName, {
        sendingPoolName: ctx.input.sendingPoolName,
        tlsPolicy: ctx.input.tlsPolicy,
        maxDeliverySeconds: ctx.input.maxDeliverySeconds
      });
      return {
        output: { configurationSetName },
        message: `Delivery options updated for **${configurationSetName}**.`
      };
    }

    if (action === 'updateSending') {
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      await client.putConfigurationSetSendingOptions(
        configurationSetName,
        ctx.input.sendingEnabled ?? true
      );
      return {
        output: { configurationSetName },
        message: `Sending ${(ctx.input.sendingEnabled ?? true) ? 'enabled' : 'disabled'} for **${configurationSetName}**.`
      };
    }

    if (action === 'updateReputation') {
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      await client.putConfigurationSetReputationOptions(
        configurationSetName,
        ctx.input.reputationMetricsEnabled ?? true
      );
      return {
        output: { configurationSetName },
        message: `Reputation metrics ${(ctx.input.reputationMetricsEnabled ?? true) ? 'enabled' : 'disabled'} for **${configurationSetName}**.`
      };
    }

    if (action === 'updateTracking') {
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      await client.putConfigurationSetTrackingOptions(
        configurationSetName,
        ctx.input.customRedirectDomain
      );
      return {
        output: { configurationSetName },
        message: `Tracking options updated for **${configurationSetName}**.`
      };
    }

    if (action === 'updateSuppression') {
      let configurationSetName = requireAwsSesString(
        ctx.input.configurationSetName,
        'configurationSetName',
        action
      );
      await client.putConfigurationSetSuppressionOptions(
        configurationSetName,
        ctx.input.suppressedReasons
      );
      return {
        output: { configurationSetName },
        message: `Suppression options updated for **${configurationSetName}**.`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();
