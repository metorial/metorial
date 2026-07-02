import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

export let updateSource = SlateTool.create(spec, {
  name: 'Update Source',
  key: 'update_source',
  description: `Update configuration for an existing Imgix source. You can change the source name, enable/disable it, modify cache TTL behavior, update default rendering parameters, configure custom domains, enable secure URL signing, or update deployment settings. Changes to deployment settings will automatically trigger redeployment.`,
  instructions: [
    'Only include the fields you want to change; omitted fields will remain unchanged.',
    'Changes to deployment configuration (subdomains, storage settings) trigger an automatic redeployment.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('ID of the source to update'),
      name: z.string().optional().describe('Updated display name'),
      enabled: z.boolean().optional().describe('Enable or disable the source'),
      secureUrlEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable secure/signed URLs'),
      cacheTtlBehavior: z
        .enum(['respect_origin', 'override_origin', 'enforce_minimum'])
        .optional()
        .describe('Cache TTL behavior'),
      cacheTtlValue: z.number().optional().describe('Cache TTL value in seconds'),
      cacheTtlError: z
        .number()
        .optional()
        .describe('Cache TTL for error responses in seconds'),
      defaultParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Default rendering parameters applied to all image requests'),
      imageError: z.string().optional().describe('URL to serve when an image request errors'),
      imageMissing: z.string().optional().describe('URL to serve when an image is not found'),
      deployment: z
        .object({
          imgixSubdomains: z.array(z.string()).optional().describe('Updated Imgix subdomains'),
          customDomains: z.array(z.string()).optional().describe('Updated custom domains')
        })
        .optional()
        .describe('Deployment settings to update')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('ID of the updated source'),
      name: z.string().describe('Name of the updated source'),
      deploymentStatus: z.string().describe('Deployment status after update'),
      enabled: z.boolean().describe('Whether the source is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);

    let attributes: Record<string, any> = {};

    if (ctx.input.name !== undefined) attributes.name = ctx.input.name;
    if (ctx.input.enabled !== undefined) attributes.enabled = ctx.input.enabled;
    if (ctx.input.secureUrlEnabled !== undefined)
      attributes.secure_url_enabled = ctx.input.secureUrlEnabled;
    if (ctx.input.cacheTtlBehavior) attributes.cache_ttl_behavior = ctx.input.cacheTtlBehavior;
    if (ctx.input.cacheTtlValue !== undefined)
      attributes.cache_ttl_value = ctx.input.cacheTtlValue;
    if (ctx.input.cacheTtlError !== undefined)
      attributes.cache_ttl_error = ctx.input.cacheTtlError;
    if (ctx.input.defaultParams) attributes.default_params = ctx.input.defaultParams;
    if (ctx.input.imageError !== undefined) attributes.image_error = ctx.input.imageError;
    if (ctx.input.imageMissing !== undefined)
      attributes.image_missing = ctx.input.imageMissing;

    if (ctx.input.deployment) {
      let deployment: Record<string, any> = {};
      if (ctx.input.deployment.imgixSubdomains)
        deployment.imgix_subdomains = ctx.input.deployment.imgixSubdomains;
      if (ctx.input.deployment.customDomains)
        deployment.custom_domains = ctx.input.deployment.customDomains;
      attributes.deployment = deployment;
    }

    let result = await client.updateSource(ctx.input.sourceId, attributes);
    let s = result.data;

    return {
      output: {
        sourceId: s.id,
        name: s.attributes?.name ?? '',
        deploymentStatus: s.attributes?.deployment_status ?? 'unknown',
        enabled: s.attributes?.enabled ?? false
      },
      message: `Updated source **${s.attributes?.name}** (${s.id}). Status: ${s.attributes?.deployment_status ?? 'unknown'}.`
    };
  })
  .build();
