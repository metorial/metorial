import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let peopleChangesPoll = SlateTrigger.create(spec, {
  name: 'People Who Recently Changed Jobs',
  key: 'people_recently_changed_jobs',
  description:
    'Polls for people who have recently changed jobs matching specified criteria. Useful for detecting job changes, new hires, and role transitions for sales prospecting and recruiting.'
})
  .input(
    z.object({
      profileLinkedinUrl: z.string().describe('LinkedIn profile URL.'),
      personName: z.string().describe('Person name.'),
      currentTitle: z.string().optional().describe('Current job title.'),
      currentCompany: z.string().optional().describe('Current company name.'),
      profileData: z.record(z.string(), z.unknown()).describe('Full profile data.')
    })
  )
  .output(
    z.object({
      profileLinkedinUrl: z.string().describe('LinkedIn profile URL.'),
      personName: z.string().describe('Person name.'),
      currentTitle: z.string().optional().describe('Current job title.'),
      currentCompany: z.string().optional().describe('Current company name.'),
      profileData: z.record(z.string(), z.unknown()).describe('Full profile data.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new CrustdataClient(ctx.auth.token);
      let state = (ctx.state as { seenUrls?: string[] } | null) ?? {};
      let seenUrls = new Set<string>(state.seenUrls ?? []);

      let result = await client.searchPeople({
        filters: [{ filterType: 'RECENTLY_CHANGED_JOBS' }],
        page: 1
      });

      let profiles = result.profiles ?? result.data ?? [];

      let newProfiles = profiles.filter((p: Record<string, unknown>) => {
        let url = String(p.linkedin_profile_url ?? p.linkedinProfileUrl ?? '');
        return url && !seenUrls.has(url);
      });

      let allUrls = profiles
        .map((p: Record<string, unknown>) =>
          String(p.linkedin_profile_url ?? p.linkedinProfileUrl ?? '')
        )
        .filter(Boolean);

      let inputs = newProfiles.map((p: Record<string, unknown>) => ({
        profileLinkedinUrl: String(p.linkedin_profile_url ?? p.linkedinProfileUrl ?? ''),
        personName: String(p.name ?? p.full_name ?? ''),
        currentTitle: (p.current_title ?? p.title) as string | undefined,
        currentCompany: (p.current_company ?? p.company) as string | undefined,
        profileData: p
      }));

      return {
        inputs,
        updatedState: {
          seenUrls: [...new Set([...Array.from(seenUrls), ...allUrls])].slice(-10000)
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'person.job_changed',
        id: ctx.input.profileLinkedinUrl,
        output: {
          profileLinkedinUrl: ctx.input.profileLinkedinUrl,
          personName: ctx.input.personName,
          currentTitle: ctx.input.currentTitle,
          currentCompany: ctx.input.currentCompany,
          profileData: ctx.input.profileData
        }
      };
    }
  })
  .build();
