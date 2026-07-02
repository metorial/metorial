import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

let technologySchema = z.object({
  slug: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  categories: z.array(z.string()).optional()
});

let similarDomainSchema = z.object({
  websiteUrl: z.string().nullable().optional(),
  name: z.string().nullable().optional()
});

export let domainIntelligence = SlateTool.create(spec, {
  name: 'Domain Intelligence',
  key: 'domain_intelligence',
  description: `Retrieve comprehensive intelligence about a domain including email count by department/seniority, webmail/disposable status, technologies used, and similar domains. Combines multiple domain analysis endpoints into one tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to analyze (e.g. "stripe.com")'),
      includeTechnologies: z
        .boolean()
        .optional()
        .describe('Include technologies used by the domain (default: true)'),
      includeSimilar: z
        .boolean()
        .optional()
        .describe('Include similar domains (default: true)'),
      includeStatus: z
        .boolean()
        .optional()
        .describe('Include webmail/disposable status (default: true)')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Analyzed domain'),
      totalEmails: z
        .number()
        .nullable()
        .optional()
        .describe('Total email count for the domain'),
      departmentBreakdown: z
        .record(z.string(), z.number())
        .optional()
        .describe('Email count by department'),
      seniorityBreakdown: z
        .record(z.string(), z.number())
        .optional()
        .describe('Email count by seniority level'),
      isWebmail: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether domain is a webmail provider'),
      isDisposable: z.boolean().nullable().optional().describe('Whether domain is disposable'),
      technologies: z
        .array(technologySchema)
        .optional()
        .describe('Technologies used by the domain'),
      similarDomains: z.array(similarDomainSchema).optional().describe('Similar domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let includeTech = ctx.input.includeTechnologies !== false;
    let includeSimilar = ctx.input.includeSimilar !== false;
    let includeStatus = ctx.input.includeStatus !== false;

    let [countResult, statusResult, techResult, similarResult] = await Promise.all([
      client.emailCount(ctx.input.domain).catch(() => null),
      includeStatus ? client.domainStatus(ctx.input.domain).catch(() => null) : null,
      includeTech ? client.technology(ctx.input.domain).catch(() => null) : null,
      includeSimilar ? client.similarDomains(ctx.input.domain).catch(() => null) : null
    ]);

    let countData = countResult?.data || {};
    let statusData = statusResult?.data || statusResult || {};
    let techData = techResult?.data || [];
    let similarData = similarResult?.data || [];

    let technologies = (Array.isArray(techData) ? techData : techData.technologies || []).map(
      (t: any) => ({
        slug: t.slug,
        name: t.name,
        icon: t.icon,
        website: t.website,
        categories: t.categories
      })
    );

    let similarDomains = (Array.isArray(similarData) ? similarData : []).map((d: any) => ({
      websiteUrl: d.website_url,
      name: d.name
    }));

    return {
      output: {
        domain: ctx.input.domain,
        totalEmails: countData.total,
        departmentBreakdown: countData.department || undefined,
        seniorityBreakdown: countData.seniority || undefined,
        isWebmail: statusData.webmail,
        isDisposable: statusData.disposable,
        technologies: includeTech ? technologies : undefined,
        similarDomains: includeSimilar ? similarDomains : undefined
      },
      message: `Domain intelligence for **${ctx.input.domain}**: ${countData.total ?? 'N/A'} total emails, ${technologies.length} technologies detected, ${similarDomains.length} similar domains found.`
    };
  })
  .build();
