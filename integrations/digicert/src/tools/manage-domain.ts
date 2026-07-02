import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let manageDomain = SlateTool.create(spec, {
  name: 'Manage Domain',
  key: 'manage_domain',
  description: `Add a new domain to your account, retrieve domain details, activate/deactivate a domain, or submit a domain for validation. Combines domain lifecycle operations into a single tool.`,
  instructions: [
    'To add a domain, provide "name" and "organizationId". Optionally set the DCV method and validation types.',
    'To get details, provide only "domainId" with no action.',
    'To activate or deactivate, set "action" to "activate" or "deactivate".',
    'To submit for domain control validation, set "action" to "submit_for_validation" and provide a "dcvMethod".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'get', 'activate', 'deactivate', 'submit_for_validation'])
        .describe('Operation to perform on the domain'),
      domainId: z
        .string()
        .optional()
        .describe('Domain ID (required for get, activate, deactivate, submit_for_validation)'),
      name: z.string().optional().describe('Domain name (required when adding a new domain)'),
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID to associate (required when adding)'),
      validationTypes: z
        .array(z.enum(['ov', 'ev']))
        .optional()
        .describe('Validation types to request when adding'),
      dcvMethod: z
        .enum(['email', 'dns-cname-token', 'dns-txt-token', 'http-token'])
        .optional()
        .describe('Domain control validation method'),
      includeValidation: z
        .boolean()
        .optional()
        .describe('Include validation status when getting details'),
      includeDcv: z
        .boolean()
        .optional()
        .describe('Include DCV token information when getting details')
    })
  )
  .output(
    z.object({
      domainId: z.number().describe('Domain ID'),
      name: z.string().optional().describe('Domain name'),
      isActive: z.boolean().optional().describe('Whether the domain is active'),
      organizationId: z.number().optional().describe('Associated organization ID'),
      validations: z
        .array(
          z.object({
            type: z.string(),
            status: z.string(),
            expiresAt: z.string().optional()
          })
        )
        .optional()
        .describe('Validation status'),
      dcvToken: z
        .object({
          token: z.string().optional(),
          status: z.string().optional(),
          method: z.string().optional()
        })
        .optional()
        .describe('DCV token details'),
      actionPerformed: z.string().describe('Description of the action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let { action } = ctx.input;

    if (action === 'add') {
      if (!ctx.input.name || !ctx.input.organizationId) {
        throw new Error('Domain name and organizationId are required when adding a domain');
      }

      ctx.progress('Adding domain...');
      let result = await client.addDomain({
        name: ctx.input.name,
        organization: { id: ctx.input.organizationId },
        validations: ctx.input.validationTypes?.map(t => ({ type: t })),
        dcv_method: ctx.input.dcvMethod
      });

      return {
        output: {
          domainId: result.id,
          name: ctx.input.name,
          organizationId: ctx.input.organizationId,
          actionPerformed: 'added'
        },
        message: `Domain **${ctx.input.name}** added (ID: ${result.id}).`
      };
    }

    if (!ctx.input.domainId) {
      throw new Error('domainId is required for this action');
    }

    if (action === 'get') {
      let domain = await client.getDomain(ctx.input.domainId, {
        include_validation: ctx.input.includeValidation,
        include_dcv: ctx.input.includeDcv
      });

      return {
        output: {
          domainId: domain.id,
          name: domain.name,
          isActive: domain.is_active,
          organizationId: domain.organization?.id,
          validations: domain.validations?.map((v: any) => ({
            type: v.type,
            status: v.status,
            expiresAt: v.expires_at
          })),
          dcvToken: domain.dcv_token
            ? {
                token: domain.dcv_token.token,
                status: domain.dcv_token.status,
                method: domain.dcv_token.method
              }
            : undefined,
          actionPerformed: 'retrieved'
        },
        message: `Domain **${domain.name}** (ID: ${domain.id}) — active: ${domain.is_active}`
      };
    }

    if (action === 'activate') {
      await client.activateDomain(ctx.input.domainId);
      return {
        output: {
          domainId: Number(ctx.input.domainId),
          isActive: true,
          actionPerformed: 'activated'
        },
        message: `Domain **${ctx.input.domainId}** activated.`
      };
    }

    if (action === 'deactivate') {
      await client.deactivateDomain(ctx.input.domainId);
      return {
        output: {
          domainId: Number(ctx.input.domainId),
          isActive: false,
          actionPerformed: 'deactivated'
        },
        message: `Domain **${ctx.input.domainId}** deactivated.`
      };
    }

    if (action === 'submit_for_validation') {
      if (!ctx.input.dcvMethod) {
        throw new Error('dcvMethod is required when submitting for validation');
      }

      ctx.progress('Submitting domain for validation...');
      let result = await client.submitDomainForValidation(ctx.input.domainId, {
        dcv_method: ctx.input.dcvMethod
      });

      return {
        output: {
          domainId: Number(ctx.input.domainId),
          dcvToken: result.dcv_token
            ? {
                token: result.dcv_token.token,
                status: result.dcv_token.status,
                method: ctx.input.dcvMethod
              }
            : undefined,
          actionPerformed: 'submitted_for_validation'
        },
        message: `Domain **${ctx.input.domainId}** submitted for validation using **${ctx.input.dcvMethod}** method.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
