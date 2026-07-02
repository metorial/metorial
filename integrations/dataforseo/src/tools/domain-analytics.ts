import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let technologySchema = z
  .object({
    name: z.string().optional().describe('Technology name'),
    category: z.string().optional().describe('Technology category'),
    group: z.string().optional().describe('Technology group')
  })
  .passthrough();

export let domainAnalytics = SlateTool.create(spec, {
  name: 'Domain Analytics',
  key: 'domain_analytics',
  description: `Retrieve comprehensive analytics for a domain including WHOIS registration data and technology stack detection. WHOIS data includes registrar, creation/expiration dates, nameservers, and registrant info. Technology detection identifies CMS, frameworks, analytics tools, CDNs, and other technologies used on the website.`,
  instructions: [
    'Provide a domain to analyze. Choose the analysis type: "whois" for registration data or "technologies" for tech stack detection.',
    'For WHOIS data, the target must be a registered domain name.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain to analyze (e.g., "example.com")'),
      analysisType: z
        .enum(['whois', 'technologies'])
        .default('whois')
        .describe('Type of analysis to perform')
    })
  )
  .output(
    z.object({
      target: z.string().describe('Analyzed domain'),
      whois: z
        .object({
          registrar: z.string().optional().describe('Domain registrar'),
          createdDate: z.string().optional().describe('Domain creation date'),
          updatedDate: z.string().optional().describe('Domain last updated date'),
          expirationDate: z.string().optional().describe('Domain expiration date'),
          nameServers: z.array(z.string()).optional().describe('Name servers'),
          registrantName: z.string().optional().describe('Registrant name'),
          registrantOrganization: z.string().optional().describe('Registrant organization'),
          registrantCountry: z.string().optional().describe('Registrant country')
        })
        .optional()
        .describe('WHOIS registration data'),
      technologies: z
        .array(technologySchema)
        .optional()
        .describe('Technologies detected on the domain'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.analysisType === 'whois') {
      let response = await client.whoisOverviewLive({ target: ctx.input.target });
      let result = client.extractFirstResult(response);

      let whoisItems = result?.items ?? [];
      let whoisData = whoisItems[0];

      return {
        output: {
          target: ctx.input.target,
          whois: whoisData
            ? {
                registrar: whoisData.registrar,
                createdDate: whoisData.creation_date,
                updatedDate: whoisData.updated_date,
                expirationDate: whoisData.expiration_date,
                nameServers: whoisData.name_servers,
                registrantName: whoisData.registrant?.name,
                registrantOrganization: whoisData.registrant?.organization,
                registrantCountry: whoisData.registrant?.country
              }
            : undefined,
          cost: response.cost
        },
        message: whoisData
          ? `WHOIS data for **${ctx.input.target}**: Registrar: **${whoisData.registrar ?? 'N/A'}**, Created: **${whoisData.creation_date ?? 'N/A'}**, Expires: **${whoisData.expiration_date ?? 'N/A'}**.`
          : `No WHOIS data found for **${ctx.input.target}**.`
      };
    } else {
      let response = await client.technologiesDomainTechnologiesLive({
        target: ctx.input.target
      });
      let result = client.extractFirstResult(response);

      let techs: Array<{ name?: string; category?: string; group?: string }> = [];
      let techGroups = result?.technologies ?? [];
      for (let group of techGroups) {
        for (let category of group.categories ?? []) {
          for (let tech of category.technologies ?? []) {
            techs.push({
              name: tech.name,
              category: category.name,
              group: group.name
            });
          }
        }
      }

      return {
        output: {
          target: ctx.input.target,
          technologies: techs,
          cost: response.cost
        },
        message: `Detected **${techs.length}** technologies on **${ctx.input.target}**.${
          techs.length > 0
            ? ` Including: ${techs
                .slice(0, 5)
                .map(t => `**${t.name}**`)
                .join(', ')}${techs.length > 5 ? '...' : ''}.`
            : ''
        }`
      };
    }
  })
  .build();
