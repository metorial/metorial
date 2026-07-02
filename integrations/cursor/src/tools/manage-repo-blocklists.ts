import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let getRepoBlocklists = SlateTool.create(spec, {
  name: 'Get Repo Blocklists',
  key: 'get_repo_blocklists',
  description: `Retrieve all repository blocklists configured for your team. Blocklists prevent files or directories matching specific patterns from being indexed or used as context. Requires an Admin API key.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      repos: z.array(
        z.object({
          repoId: z.string().describe('Blocklist entry ID'),
          url: z.string().describe('Repository URL'),
          patterns: z.array(z.string()).describe('Glob patterns that are blocked')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.getRepoBlocklists();

    return {
      output: {
        repos: result.repos.map(r => ({
          repoId: r.id,
          url: r.url,
          patterns: r.patterns
        }))
      },
      message: `Found **${result.repos.length}** repo blocklist(s).`
    };
  })
  .build();

export let upsertRepoBlocklists = SlateTool.create(spec, {
  name: 'Upsert Repo Blocklists',
  key: 'upsert_repo_blocklists',
  description: `Add or update repository blocklist patterns. If a blocklist for the repository URL already exists, its patterns will be updated. Use glob patterns to block files or directories from being indexed or used as context. Requires an Admin API key.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      repos: z
        .array(
          z.object({
            url: z.string().describe('Repository URL'),
            patterns: z
              .array(z.string())
              .describe('Glob patterns to block (e.g. "*.env", "secrets/**")')
          })
        )
        .describe('List of repositories and their blocklist patterns')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    await client.upsertRepoBlocklists(ctx.input.repos);

    return {
      output: {
        success: true
      },
      message: `Upserted blocklist patterns for **${ctx.input.repos.length}** repository(ies).`
    };
  })
  .build();

export let deleteRepoBlocklist = SlateTool.create(spec, {
  name: 'Delete Repo Blocklist',
  key: 'delete_repo_blocklist',
  description: `Delete a repository blocklist entry by its ID. After deletion, the repository's files will no longer be blocked from indexing. Requires an Admin API key.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      repoId: z
        .string()
        .describe('ID of the blocklist entry to delete (from get repo blocklists)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    await client.deleteRepoBlocklist(ctx.input.repoId);

    return {
      output: {
        success: true
      },
      message: `Repo blocklist **${ctx.input.repoId}** has been deleted.`
    };
  })
  .build();
