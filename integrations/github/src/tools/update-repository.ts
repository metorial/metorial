import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let updateRepository = SlateTool.create(spec, {
  name: 'Update Repository',
  key: 'update_repository',
  description: `Update settings of an existing GitHub repository.
Modify name, description, visibility, feature toggles (issues, wiki, projects), default branch, and archive status.`
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      name: z.string().optional().describe('New repository name'),
      description: z.string().optional().describe('New description'),
      homepage: z.string().optional().describe('Homepage URL'),
      private: z.boolean().optional().describe('Set repository visibility'),
      hasIssues: z.boolean().optional().describe('Enable or disable issues'),
      hasProjects: z.boolean().optional().describe('Enable or disable projects'),
      hasWiki: z.boolean().optional().describe('Enable or disable wiki'),
      defaultBranch: z.string().optional().describe('Change default branch'),
      archived: z.boolean().optional().describe('Archive or unarchive the repository')
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Unique repository ID'),
      name: z.string().describe('Repository name'),
      fullName: z.string().describe('Full name in owner/repo format'),
      htmlUrl: z.string().describe('URL to the repository on GitHub'),
      private: z.boolean().describe('Whether the repository is private'),
      defaultBranch: z.string().describe('Default branch name'),
      archived: z.boolean().describe('Whether the repository is archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, ...updateData } = ctx.input;
    let updated = await client.updateRepository(owner, repo, updateData);

    return {
      output: {
        repositoryId: updated.id,
        name: updated.name,
        fullName: updated.full_name,
        htmlUrl: updated.html_url,
        private: updated.private,
        defaultBranch: updated.default_branch,
        archived: updated.archived
      },
      message: `Updated repository **${updated.full_name}**.`
    };
  })
  .build();
