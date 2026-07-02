import { SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

let vulnerabilitySchema = z.object({
  xfid: z.number().optional().describe('X-Force Database ID'),
  stdCode: z.array(z.string()).optional().describe('Standard codes (CVE, BID, etc.)'),
  title: z.string().optional().describe('Vulnerability title'),
  description: z.string().optional().describe('Vulnerability description'),
  riskLevel: z.number().optional().describe('Risk level score'),
  cvss: z.record(z.string(), z.any()).optional().describe('CVSS scoring details'),
  reportedDate: z.string().optional().describe('Date the vulnerability was reported'),
  platforms: z.array(z.string()).optional().describe('Affected platforms'),
  tagName: z.string().optional().describe('Tag/category name'),
  references: z
    .array(
      z.object({
        linkTarget: z.string().optional(),
        description: z.string().optional()
      })
    )
    .optional()
    .describe('External references'),
  remedy: z.string().optional().describe('Remediation guidance')
});

export let searchVulnerabilities = SlateTool.create(spec, {
  name: 'Search Vulnerabilities',
  key: 'search_vulnerabilities',
  description: `Search the X-Force vulnerability database by full-text query, specific identifier (CVE, XFID, BID, RHSA, Microsoft Bulletin), or retrieve recently reported vulnerabilities.
Returns vulnerability details including CVSS scores, affected platforms, remediation guidance, and references.`,
  instructions: [
    'Use "query" for full-text search across vulnerability descriptions and titles.',
    'Use "vulnerabilityId" to look up a specific vulnerability by XFID, CVE, or other standard identifier.',
    'Use "startDate" and "endDate" to filter recently reported vulnerabilities by date range (YYYY-MM-DD format).'
  ],
  constraints: [
    'Full-text search may return many results; use specific identifiers when possible.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query for vulnerabilities'),
      vulnerabilityId: z
        .string()
        .optional()
        .describe('Specific vulnerability identifier (XFID, CVE, BID, RHSA, MS Bulletin)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for recent vulnerabilities (YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('End date for recent vulnerabilities (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      vulnerabilities: z.array(vulnerabilitySchema).describe('Matching vulnerability records'),
      totalCount: z.number().optional().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient({
      token: ctx.auth.token,
      password: ctx.auth.password
    });

    if (ctx.input.vulnerabilityId) {
      ctx.progress('Looking up vulnerability...');
      let report = await client.getVulnerabilityByXfid(ctx.input.vulnerabilityId);
      let vulns = Array.isArray(report) ? report : [report];

      let mapped = vulns.map((v: any) => ({
        xfid: v.xfdbid,
        stdCode: v.stdcode,
        title: v.title,
        description: v.description,
        riskLevel: v.risk_level,
        cvss: v.cvss,
        reportedDate: v.reported,
        platforms: v.platforms_affected?.map((p: any) => (typeof p === 'string' ? p : p.text)),
        tagName: v.tagname,
        references: v.references?.map((r: any) => ({
          linkTarget: r.link_target,
          description: r.description
        })),
        remedy: v.remedy
      }));

      return {
        output: { vulnerabilities: mapped, totalCount: mapped.length },
        message: `Found vulnerability **${ctx.input.vulnerabilityId}**: ${mapped[0]?.title || 'N/A'}`
      };
    }

    if (ctx.input.query) {
      ctx.progress('Searching vulnerabilities...');
      let report = await client.searchVulnerabilities(ctx.input.query);
      let rows = report.rows || report || [];
      let totalRows = report.totalRows || rows.length;

      let mapped = rows.slice(0, ctx.input.limit || 25).map((v: any) => ({
        xfid: v.xfdbid,
        stdCode: v.stdcode,
        title: v.title,
        description: v.description,
        riskLevel: v.risk_level,
        cvss: v.cvss,
        reportedDate: v.reported,
        platforms: v.platforms_affected?.map((p: any) => (typeof p === 'string' ? p : p.text)),
        tagName: v.tagname,
        remedy: v.remedy
      }));

      return {
        output: { vulnerabilities: mapped, totalCount: totalRows },
        message: `Found **${totalRows}** vulnerabilities matching "${ctx.input.query}" (showing ${mapped.length})`
      };
    }

    ctx.progress('Fetching recent vulnerabilities...');
    let report = await client.getRecentVulnerabilities(
      ctx.input.startDate,
      ctx.input.endDate,
      ctx.input.limit || 25
    );
    let rows = report.rows || report || [];
    let totalRows = report.totalRows || rows.length;

    let mapped = rows.map((v: any) => ({
      xfid: v.xfdbid,
      stdCode: v.stdcode,
      title: v.title,
      description: v.description,
      riskLevel: v.risk_level,
      cvss: v.cvss,
      reportedDate: v.reported,
      tagName: v.tagname
    }));

    return {
      output: { vulnerabilities: mapped, totalCount: totalRows },
      message: `Retrieved **${mapped.length}** recent vulnerabilities${ctx.input.startDate ? ` since ${ctx.input.startDate}` : ''}`
    };
  })
  .build();
