import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { spec } from '../spec';

let sessionSchema = z.object({
  sessionId: z.string().optional().describe('Session ID'),
  timestamp: z.string().optional().describe('Session timestamp'),
  duration: z.number().optional().describe('Session duration in seconds'),
  pagesViewed: z.number().optional().describe('Number of pages viewed in session'),
  entryUrl: z.string().optional().describe('Entry URL for the session'),
  referrer: z.string().optional().describe('Referrer URL'),
  channel: z.string().optional().describe('Traffic channel'),
  browser: z.string().optional().describe('Browser used'),
  platform: z.string().optional().describe('Operating system/platform'),
  country: z.string().optional().describe('Country'),
  city: z.string().optional().describe('City')
});

export let getLeadDetails = SlateTool.create(spec, {
  name: 'Get Lead Details',
  key: 'get_lead_details',
  description: `Retrieve detailed information about a specific lead including their full profile, company data, engagement metrics, and session history. Provides a comprehensive behavioral profile of the lead.`,
  instructions: [
    'The `leadId` is the LeadBoxer user ID (use_id) obtained from the Get Leads tool or tracking events.',
    'Set `includeSessions` to true to also fetch the session history for the lead.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('The LeadBoxer user ID of the lead'),
      includeSessions: z
        .boolean()
        .optional()
        .describe('Whether to include session history. Defaults to false.')
    })
  )
  .output(
    z.object({
      leadId: z.string().optional().describe('LeadBoxer user ID'),
      email: z.string().optional().describe('Lead email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      role: z.string().optional().describe('Job role/title'),
      companyName: z.string().optional().describe('Company name'),
      companyDomain: z.string().optional().describe('Company domain'),
      companyDescription: z.string().optional().describe('Company description'),
      industry: z.string().optional().describe('Industry'),
      industryGroup: z.string().optional().describe('Industry group'),
      employeeCountRange: z.string().optional().describe('Employee count range'),
      companyType: z.string().optional().describe('Company type'),
      yearFounded: z.string().optional().describe('Year the company was founded'),
      companyLinkedin: z.string().optional().describe('Company LinkedIn URL'),
      companyCountry: z.string().optional().describe('Company country'),
      companyCity: z.string().optional().describe('Company city'),
      engagementScore: z.number().optional().describe('Engagement score (0-100)'),
      identificationScore: z.number().optional().describe('Identification confidence score'),
      totalVisits: z.number().optional().describe('Total visits'),
      totalPagesViewed: z.number().optional().describe('Total pages viewed'),
      totalSessionDuration: z
        .number()
        .optional()
        .describe('Total session duration in seconds'),
      lastEventTime: z.string().optional().describe('Timestamp of last event'),
      lastChannel: z.string().optional().describe('Last traffic channel'),
      lastCountry: z.string().optional().describe('Last visitor country'),
      lastCity: z.string().optional().describe('Last visitor city'),
      lastBrowser: z.string().optional().describe('Last browser used'),
      lastPlatform: z.string().optional().describe('Last platform/OS'),
      entryUrl: z.string().optional().describe('Entry URL'),
      sessions: z.array(sessionSchema).optional().describe('Session history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.config.datasetId
    });

    let rawDetail = await client.getLeadDetail(ctx.input.leadId);

    let lead: any = rawDetail;
    if (rawDetail?.resultsList) {
      lead = Array.isArray(rawDetail.resultsList)
        ? rawDetail.resultsList[0]
        : rawDetail.resultsList;
    }

    lead = lead || {};

    let sessions: any[] | undefined;
    if (ctx.input.includeSessions) {
      try {
        let rawSessions = await client.getLeadSessions(ctx.input.leadId);
        sessions = Array.isArray(rawSessions)
          ? rawSessions.map((s: any) => ({
              sessionId: s.session_id || s.sessionId,
              timestamp: s.timestamp || s.eventEsTimestamp,
              duration: s.duration != null ? Number(s.duration) : undefined,
              pagesViewed: s.pages_viewed != null ? Number(s.pages_viewed) : undefined,
              entryUrl: s.entry_url || s.entry_root_url,
              referrer: s.referrer || s.last_referrer,
              channel: s.channel || s.last_channel,
              browser: s.browser || s.last_browser,
              platform: s.platform || s.last_platform,
              country: s.country || s.last_country_name,
              city: s.city || s.last_city
            }))
          : [];
      } catch (_e) {
        ctx.warn('Could not fetch sessions for this lead.');
        sessions = [];
      }
    }

    let output = {
      leadId: lead.use_id || ctx.input.leadId,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      role: lead.role,
      companyName: lead.organizationName || lead.last_most_likely_company,
      companyDomain: lead.organizationDomain,
      companyDescription: lead.organizationDescription || lead.organizationDescriptionShort,
      industry: lead.organizationIndustryName,
      industryGroup: lead.organizationIndustryGroup,
      employeeCountRange: lead.organizationEmployeeCountRangeName,
      companyType: lead.organizationType,
      yearFounded: lead.organizationYearFounded,
      companyLinkedin: lead.organizationLinkedinUrl,
      companyCountry: lead.organizationCountry,
      companyCity: lead.organizationCity,
      engagementScore: lead.esScore != null ? Number(lead.esScore) : undefined,
      identificationScore: lead.total_score != null ? Number(lead.total_score) : undefined,
      totalVisits:
        lead.total_number_visits != null ? Number(lead.total_number_visits) : undefined,
      totalPagesViewed:
        lead.total_pages_viewed != null ? Number(lead.total_pages_viewed) : undefined,
      totalSessionDuration:
        lead.total_session_duration != null ? Number(lead.total_session_duration) : undefined,
      lastEventTime: lead.lastEvent || lead.prettyLastEvent,
      lastChannel: lead.last_channel,
      lastCountry: lead.last_country_name,
      lastCity: lead.last_city,
      lastBrowser: lead.last_browser,
      lastPlatform: lead.last_platform,
      entryUrl: lead.entry_root_url,
      sessions
    };

    let name =
      [lead.firstName, lead.lastName].filter(Boolean).join(' ') ||
      lead.email ||
      ctx.input.leadId;
    return {
      output,
      message: `Retrieved details for lead **${name}**${lead.organizationName ? ` from **${lead.organizationName}**` : ''}.${sessions ? ` Includes ${sessions.length} session(s).` : ''}`
    };
  })
  .build();
