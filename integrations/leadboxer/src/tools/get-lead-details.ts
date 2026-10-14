import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { leadNumber, leadString } from '../lib/responses';
import { accountEmailSchema, datasetIdSchema, getLegacyDatasetId } from '../lib/schemas';
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
    'Call list_datasets to discover the dataset ID. Existing connections can use their saved dataset.',
    'Provide accountEmail for the account that owns the API key, or save it with the connection. This is not the lead email.',
    'Set includeSessions to true to fetch a page of session history. Use sessionsNextToken with sessionsPageToken to retrieve the next page.'
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
        .describe('Whether to include session history. Defaults to false.'),
      datasetId: datasetIdSchema,
      accountEmail: accountEmailSchema,
      sessionsLimit: z
        .number()
        .optional()
        .describe(
          'Number of sessions to retrieve, from 1 to 10000. Defaults to 100. Used when includeSessions is true.'
        ),
      sessionsPageToken: z
        .string()
        .optional()
        .describe(
          'Pagination token from sessionsNextToken. Valid for 10 minutes. Used when includeSessions is true.'
        )
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
      sessions: z.array(sessionSchema).optional().describe('Session history'),
      sessionsNextToken: z
        .string()
        .optional()
        .describe('Token to fetch another page of sessions. Valid for 10 minutes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.input.datasetId ?? getLegacyDatasetId(ctx.config),
      accountEmail: ctx.input.accountEmail ?? ctx.auth.accountEmail
    });

    let lead = await client.getLeadDetail(ctx.input.leadId);
    let sessions: z.infer<typeof sessionSchema>[] | undefined;
    let sessionsNextToken: string | undefined;
    if (ctx.input.includeSessions) {
      let rawSessions = await client.getLeadSessions(
        ctx.input.leadId,
        ctx.input.sessionsLimit,
        ctx.input.sessionsPageToken
      );
      sessions = rawSessions.data.map(s => ({
        sessionId: leadString(s.session_id ?? s.sessionId ?? s.ses_id),
        timestamp: leadString(s.timestamp ?? s.eventEsTimestamp),
        duration: leadNumber(s.duration ?? s.session_duration),
        pagesViewed: leadNumber(s.pages_viewed),
        entryUrl: leadString(s.entry_url || s.entry_root_url),
        referrer: leadString(s.referrer || s.last_referrer),
        channel: leadString(s.channel || s.last_channel),
        browser: leadString(s.browser || s.last_browser),
        platform: leadString(s.platform || s.last_platform),
        country: leadString(s.country || s.last_country_name),
        city: leadString(s.city || s.last_city)
      }));
      sessionsNextToken = leadString(rawSessions.metaData.nextToken);
    }

    let output = {
      leadId: leadString(lead.use_id) || ctx.input.leadId,
      email: leadString(lead.email),
      firstName: leadString(lead.firstName),
      lastName: leadString(lead.lastName),
      role: leadString(lead.role),
      companyName: leadString(lead.organizationName || lead.last_most_likely_company),
      companyDomain: leadString(lead.organizationDomain),
      companyDescription: leadString(
        lead.organizationDescription || lead.organizationDescriptionShort
      ),
      industry: leadString(lead.organizationIndustryName),
      industryGroup: leadString(lead.organizationIndustryGroup),
      employeeCountRange: leadString(lead.organizationEmployeeCountRangeName),
      companyType: leadString(lead.organizationType),
      yearFounded: leadString(lead.organizationYearFounded),
      companyLinkedin: leadString(lead.organizationLinkedinUrl),
      companyCountry: leadString(lead.organizationCountry),
      companyCity: leadString(lead.organizationCity),
      engagementScore: leadNumber(lead.esScore),
      identificationScore: leadNumber(lead.total_score),
      totalVisits: leadNumber(lead.total_number_visits),
      totalPagesViewed: leadNumber(lead.total_pages_viewed),
      totalSessionDuration: leadNumber(lead.total_session_duration),
      lastEventTime: leadString(lead.lastEvent || lead.prettyLastEvent),
      lastChannel: leadString(lead.last_channel),
      lastCountry: leadString(lead.last_country_name),
      lastCity: leadString(lead.last_city),
      lastBrowser: leadString(lead.last_browser),
      lastPlatform: leadString(lead.last_platform),
      entryUrl: leadString(lead.entry_root_url),
      sessions,
      sessionsNextToken
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
