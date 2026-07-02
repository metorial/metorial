import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDomainsTool = SlateTool.create(spec, {
  name: 'Get Domains',
  key: 'get_domains',
  description: `List all domains (both Railway-provided and custom) for a service in a specific environment. Includes DNS record status for custom domains.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      environmentId: z.string().describe('ID of the environment'),
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      serviceDomains: z.array(
        z.object({
          domainId: z.string().describe('Domain ID'),
          domain: z.string().describe('Full domain name (*.up.railway.app)'),
          suffix: z.string().nullable().describe('Domain suffix'),
          targetPort: z.number().nullable().describe('Target port')
        })
      ),
      customDomains: z.array(
        z.object({
          domainId: z.string().describe('Domain ID'),
          domain: z.string().describe('Custom domain name'),
          dnsRecords: z.array(
            z.object({
              hostlabel: z.string().describe('DNS host label'),
              requiredValue: z.string().describe('Required DNS value'),
              currentValue: z.string().nullable().describe('Current DNS value'),
              status: z.string().describe('DNS record status')
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let domains = await client.getDomains(
      ctx.input.projectId,
      ctx.input.environmentId,
      ctx.input.serviceId
    );

    let serviceDomains = (domains.serviceDomains || []).map((d: any) => ({
      domainId: d.id,
      domain: d.domain,
      suffix: d.suffix ?? null,
      targetPort: d.targetPort ?? null
    }));

    let customDomains = (domains.customDomains || []).map((d: any) => ({
      domainId: d.id,
      domain: d.domain,
      dnsRecords: (d.status?.dnsRecords || []).map((r: any) => ({
        hostlabel: r.hostlabel,
        requiredValue: r.requiredValue,
        currentValue: r.currentValue ?? null,
        status: r.status
      }))
    }));

    return {
      output: { serviceDomains, customDomains },
      message: `Found **${serviceDomains.length}** Railway domain(s) and **${customDomains.length}** custom domain(s).`
    };
  })
  .build();

export let createDomainTool = SlateTool.create(spec, {
  name: 'Create Domain',
  key: 'create_domain',
  description: `Add a domain to a Railway service. Creates either a Railway-provided domain (*.up.railway.app) or attaches a custom domain. For custom domains, DNS records will be provided that must be configured with your DNS provider.`,
  instructions: [
    'To generate a Railway-provided domain, omit the "customDomain" field.',
    'To attach a custom domain, provide the "customDomain" field with your domain name (e.g., "api.example.com").'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      environmentId: z.string().describe('ID of the environment'),
      serviceId: z.string().describe('ID of the service'),
      customDomain: z
        .string()
        .optional()
        .describe(
          'Custom domain name to attach (e.g., "api.example.com"). Omit to generate a Railway-provided domain.'
        ),
      targetPort: z
        .number()
        .optional()
        .describe('Target port on the service to route traffic to')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('ID of the created domain'),
      domain: z.string().describe('Full domain name'),
      isCustom: z.boolean().describe('Whether this is a custom domain'),
      dnsRecords: z
        .array(
          z.object({
            hostlabel: z.string(),
            requiredValue: z.string(),
            status: z.string()
          })
        )
        .nullable()
        .describe('DNS records to configure (only for custom domains)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.customDomain) {
      let result = await client.createCustomDomain({
        projectId: ctx.input.projectId,
        environmentId: ctx.input.environmentId,
        serviceId: ctx.input.serviceId,
        domain: ctx.input.customDomain,
        targetPort: ctx.input.targetPort
      });

      let dnsRecords = (result.status?.dnsRecords || []).map((r: any) => ({
        hostlabel: r.hostlabel,
        requiredValue: r.requiredValue,
        status: r.status
      }));

      return {
        output: {
          domainId: result.id,
          domain: result.domain,
          isCustom: true,
          dnsRecords
        },
        message: `Custom domain **${result.domain}** added. Configure the provided DNS records with your DNS provider.`
      };
    } else {
      let result = await client.createServiceDomain({
        serviceId: ctx.input.serviceId,
        environmentId: ctx.input.environmentId,
        targetPort: ctx.input.targetPort
      });

      return {
        output: {
          domainId: result.id,
          domain: result.domain,
          isCustom: false,
          dnsRecords: null
        },
        message: `Railway domain **${result.domain}** created.`
      };
    }
  })
  .build();

export let deleteDomainTool = SlateTool.create(spec, {
  name: 'Delete Domain',
  key: 'delete_domain',
  description: `Remove a domain from a Railway service. Works for both Railway-provided domains and custom domains. Use **isCustom** to specify the domain type.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to delete'),
      isCustom: z
        .boolean()
        .describe(
          'Whether this is a custom domain (true) or a Railway-provided domain (false)'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the domain was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.isCustom) {
      await client.deleteCustomDomain(ctx.input.domainId);
    } else {
      await client.deleteServiceDomain(ctx.input.domainId);
    }

    return {
      output: { deleted: true },
      message: `Domain deleted successfully.`
    };
  })
  .build();
