import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageEmailProviders = SlateTool.create(spec, {
  name: 'Manage Email Providers',
  key: 'manage_email_providers',
  description: `List, add, delete email providers (mailboxes), and manage email warmup settings.
- **list**: List all email providers with masked sensitive data.
- **add**: Connect a new email provider.
- **delete**: Remove an email provider.
- **enable_warmup**: Enable email warmup for a provider.
- **disable_warmup**: Disable email warmup for a provider.
- **list_warmups**: List warmup status for all providers.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'delete', 'enable_warmup', 'disable_warmup', 'list_warmups'])
        .describe('Operation to perform'),
      providerId: z
        .string()
        .optional()
        .describe('Provider ID (required for delete, enable_warmup, disable_warmup)'),
      providerConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider configuration (for add)')
    })
  )
  .output(
    z.object({
      providers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of email providers'),
      provider: z.record(z.string(), z.unknown()).optional().describe('Provider details'),
      warmups: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Warmup statuses'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, providerId, providerConfig } = ctx.input;

    if (action === 'list') {
      let providers = await client.listEmailProviders();
      let providerList = Array.isArray(providers) ? providers : [];
      return {
        output: { providers: providerList, success: true },
        message: `Retrieved **${providerList.length}** email provider(s).`
      };
    }

    if (action === 'add') {
      if (!providerConfig) throw new Error('Provider configuration is required');
      let provider = await client.addEmailProvider(providerConfig);
      return {
        output: { provider, success: true },
        message: `Added new email provider.`
      };
    }

    if (action === 'delete') {
      if (!providerId) throw new Error('Provider ID is required');
      await client.deleteEmailProvider(providerId);
      return {
        output: { success: true },
        message: `Deleted email provider **${providerId}**.`
      };
    }

    if (action === 'enable_warmup') {
      if (!providerId) throw new Error('Provider ID is required');
      await client.enableWarmup(providerId);
      return {
        output: { success: true },
        message: `Enabled warmup for provider **${providerId}**.`
      };
    }

    if (action === 'disable_warmup') {
      if (!providerId) throw new Error('Provider ID is required');
      await client.disableWarmup(providerId);
      return {
        output: { success: true },
        message: `Disabled warmup for provider **${providerId}**.`
      };
    }

    if (action === 'list_warmups') {
      let warmups = await client.listWarmups();
      let warmupList = Array.isArray(warmups) ? warmups : [];
      return {
        output: { warmups: warmupList, success: true },
        message: `Retrieved warmup status for **${warmupList.length}** provider(s).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
