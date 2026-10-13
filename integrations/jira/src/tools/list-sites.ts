import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import {
  activeJiraSite,
  createJiraClient,
  fetchAccessibleJiraSites,
  type JiraSite
} from '../lib/site';
import { spec } from '../spec';

let siteOutputSchema = z.object({
  cloudId: z.string().describe('Atlassian Cloud ID of the site.'),
  url: z.string().optional().describe('Site URL, e.g. https://mycompany.atlassian.net.'),
  name: z.string().optional().describe('Site name.'),
  isDefault: z
    .boolean()
    .describe('Whether tools use this site when no site input is provided.')
});

let toSiteOutput = (site: JiraSite, defaultCloudId: string) => ({
  cloudId: site.cloudId,
  url: site.url || undefined,
  name: site.name || undefined,
  isDefault: site.cloudId === defaultCloudId
});

export let listSitesTool = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `List the Atlassian sites this Jira connection can access and show which site tools use by default. Use it when an issue, project, or board cannot be found, then pass the right site in the site input of other Jira tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      defaultSite: siteOutputSchema.describe(
        'The site tools use when no site input is given.'
      ),
      sites: z.array(siteOutputSchema).describe('All sites this connection can access.')
    })
  )
  .handleInvocation(async ctx => {
    let active = activeJiraSite(ctx.auth);
    let sites: JiraSite[];

    if (ctx.auth.refreshToken) {
      sites = await fetchAccessibleJiraSites(ctx.auth.token);
      let current = sites.find(site => site.cloudId === active.cloudId);
      if (current) {
        active = {
          cloudId: active.cloudId,
          url: active.url || current.url,
          name: active.name || current.name
        };
      }
    } else {
      // API token connections are bound to one site. Older connections did not
      // store the site URL, so read it (and the site title) from Jira.
      if (!active.url) {
        let client = await createJiraClient(ctx.auth);
        let serverInfo = await client.getServerInfo();
        active = {
          cloudId: active.cloudId,
          url:
            active.url || (typeof serverInfo?.baseUrl === 'string' ? serverInfo.baseUrl : ''),
          name:
            active.name ||
            (typeof serverInfo?.serverTitle === 'string' ? serverInfo.serverTitle : '')
        };
      }
      sites = [active];
    }

    let defaultSite = toSiteOutput(active, active.cloudId);
    let siteList = sites.map(site =>
      site.cloudId === active.cloudId ? defaultSite : toSiteOutput(site, active.cloudId)
    );

    return {
      output: {
        defaultSite,
        sites: siteList
      },
      message: `This connection can access **${siteList.length}** Jira site(s). Default site: ${defaultSite.name ?? defaultSite.url ?? defaultSite.cloudId}.`
    };
  })
  .build();
