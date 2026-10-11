import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient, type RepoType, repoWebUrl } from '../lib/client';
import { huggingFaceServiceError } from '../lib/errors';
import { spec } from '../spec';

let resolveRepoId = (result: any, fallbackNamespace: string | undefined, name: string) => {
  if (typeof result?.name === 'string' && result.name.includes('/')) {
    return result.name as string;
  }

  if (typeof result?.url === 'string') {
    try {
      let segments = new URL(result.url).pathname.split('/').filter(Boolean);
      if (segments[0] === 'datasets' || segments[0] === 'spaces') segments = segments.slice(1);
      if (segments.length >= 2) return `${segments[0]}/${segments[1]}`;
    } catch {
      // Fall through to the namespace-based fallback.
    }
  }

  return fallbackNamespace ? `${fallbackNamespace}/${name}` : undefined;
};

export let createRepositoryTool = SlateTool.create(spec, {
  name: 'Create Repository',
  key: 'create_repository',
  description: `Create a new model, dataset, or Space repository on Hugging Face Hub. Supports setting visibility, SDK type (for Spaces), and license.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository to create'),
      name: z.string().describe('Repository name (without namespace prefix)'),
      organization: z
        .string()
        .optional()
        .describe('Organization namespace; if omitted, creates under the authenticated user'),
      private: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the repository should be private'),
      sdk: z
        .enum(['gradio', 'streamlit', 'docker', 'static'])
        .optional()
        .describe(
          'SDK for Spaces (required when repoType is "space"). Hugging Face currently accepts "gradio", "docker", or "static"; Streamlit apps are created with "docker".'
        ),
      license: z.string().optional().describe('License identifier (e.g. "mit", "apache-2.0")')
    })
  )
  .output(
    z.object({
      url: z.string().describe('URL of the created repository'),
      repoId: z.string().optional().describe('Full repository ID ("namespace/name")')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.repoType === 'space' && !ctx.input.sdk) {
      throw huggingFaceServiceError(
        'sdk is required when creating a Space. Use "gradio", "docker", or "static".'
      );
    }

    if (ctx.input.sdk === 'streamlit') {
      throw huggingFaceServiceError(
        'Hugging Face no longer creates Streamlit Spaces directly. Use sdk "docker" with a Streamlit Docker template instead.'
      );
    }

    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.createRepo({
      repoType: ctx.input.repoType,
      name: ctx.input.name,
      organization: ctx.input.organization,
      private: ctx.input.private,
      sdk: ctx.input.sdk,
      license: ctx.input.license
    });

    return {
      output: {
        url: result.url,
        repoId: resolveRepoId(result, ctx.input.organization, ctx.input.name)
      },
      message: `Created ${ctx.input.repoType} repository **${ctx.input.name}**${ctx.input.organization ? ` under ${ctx.input.organization}` : ''}.`
    };
  })
  .build();

export let deleteRepositoryTool = SlateTool.create(spec, {
  name: 'Delete Repository',
  key: 'delete_repository',
  description: `Permanently delete a model, dataset, or Space repository from Hugging Face Hub. This action is irreversible.`,
  tags: {
    destructive: true
  },
  constraints: [
    'This action is irreversible. The repository and all its contents will be permanently deleted.'
  ]
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository to delete'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      organization: z
        .string()
        .optional()
        .describe(
          'Deprecated: the namespace is taken from repoId. If provided, it must match the repoId namespace.'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the repository was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let namespace = ctx.input.repoId.split('/')[0];
    if (ctx.input.organization && ctx.input.organization !== namespace) {
      throw huggingFaceServiceError(
        `organization "${ctx.input.organization}" does not match the repoId namespace "${namespace}".`
      );
    }

    let client = new HubClient({ token: ctx.auth.token });

    await client.deleteRepo({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId
    });

    return {
      output: { deleted: true },
      message: `Deleted ${ctx.input.repoType} repository **${ctx.input.repoId}**.`
    };
  })
  .build();

export let duplicateRepositoryTool = SlateTool.create(spec, {
  name: 'Duplicate Repository',
  key: 'duplicate_repository',
  description: `Duplicate a Hugging Face Space, model, or dataset repository into a new repository under your account or an organization. Space duplicates can also set hardware and sleep time.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z
        .enum(['space', 'model', 'dataset'])
        .default('space')
        .describe('Repository type to duplicate (defaults to "space")'),
      sourceRepoId: z.string().describe('Source repository ID (e.g. "owner/source-space")'),
      destinationRepoId: z
        .string()
        .describe(
          'Destination repository ID ("namespace/name"). A bare name is created under the authenticated user.'
        ),
      private: z
        .boolean()
        .optional()
        .describe('Whether the duplicate should be private. Do not combine with visibility.'),
      visibility: z
        .enum(['private', 'public', 'protected'])
        .optional()
        .describe('Visibility for the duplicate; "protected" is only supported for Spaces'),
      hardware: z
        .string()
        .optional()
        .describe(
          'Optional hardware flavor for a duplicated Space (e.g. "cpu-basic", "t4-small")'
        ),
      sleepTimeSeconds: z
        .number()
        .optional()
        .describe('Optional Space sleep timeout in seconds, or -1 to disable sleep')
    })
  )
  .output(
    z.object({
      url: z.string().optional().describe('URL of the duplicated repository'),
      repoId: z.string().describe('Destination repository ID')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.private !== undefined && ctx.input.visibility !== undefined) {
      throw huggingFaceServiceError('Provide either private or visibility, not both.');
    }

    let repoType: RepoType = ctx.input.repoType;
    if (
      repoType !== 'space' &&
      (ctx.input.hardware || ctx.input.sleepTimeSeconds !== undefined)
    ) {
      throw huggingFaceServiceError('hardware and sleepTimeSeconds only apply to Spaces.');
    }

    let client = new HubClient({ token: ctx.auth.token });
    let destinationRepoId = ctx.input.destinationRepoId.trim();
    if (!destinationRepoId.includes('/')) {
      let me = await client.whoami();
      destinationRepoId = `${me.name}/${destinationRepoId}`;
    }

    let visibility =
      ctx.input.visibility ??
      (ctx.input.private === undefined ? undefined : ctx.input.private ? 'private' : 'public');

    let result = await client.duplicateRepo({
      repoType,
      sourceRepoId: ctx.input.sourceRepoId,
      destinationRepoId,
      visibility,
      hardware: ctx.input.hardware,
      sleepTimeSeconds: ctx.input.sleepTimeSeconds
    });

    return {
      output: {
        url: result?.url ?? repoWebUrl(repoType, destinationRepoId),
        repoId: destinationRepoId
      },
      message: `Duplicated ${repoType} **${ctx.input.sourceRepoId}** to **${destinationRepoId}**.`
    };
  })
  .build();

export let getRepositoryInfoTool = SlateTool.create(spec, {
  name: 'Get Repository Info',
  key: 'get_repository_info',
  description: `Get detailed information about a model, dataset, or Space repository on Hugging Face Hub. Returns metadata including tags, downloads, likes, pipeline task, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      revision: z.string().optional().describe('Git revision (branch, tag, or commit SHA)')
    })
  )
  .output(
    z.object({
      repoId: z.string().describe('Full repository ID'),
      repoType: z.string().describe('Repository type'),
      private: z.boolean().optional().describe('Whether the repository is private'),
      author: z.string().optional().describe('Author/owner'),
      sha: z.string().optional().describe('Latest commit SHA'),
      lastModified: z.string().optional().describe('Last modification timestamp'),
      disabled: z.boolean().optional().describe('Whether the repository is disabled'),
      gated: z.any().optional().describe('Gating configuration'),
      downloads: z.number().optional().describe('Total download count'),
      likes: z.number().optional().describe('Number of likes'),
      tags: z.array(z.string()).optional().describe('Tags'),
      pipelineTag: z.string().optional().describe('Pipeline/task tag'),
      libraryName: z.string().optional().describe('Library name'),
      cardData: z.any().optional().describe('Parsed model/dataset card metadata'),
      siblings: z
        .array(
          z.object({
            rfilename: z.string().describe('File path in repository')
          })
        )
        .optional()
        .describe('List of files in the repository')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let info = await client.getRepoInfo({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      revision: ctx.input.revision
    });

    return {
      output: {
        repoId: info.modelId || info.id || info._id,
        repoType: ctx.input.repoType,
        private: info.private,
        author: info.author,
        sha: info.sha,
        lastModified: info.lastModified,
        disabled: info.disabled,
        gated: info.gated,
        downloads: info.downloads,
        likes: info.likes,
        tags: info.tags,
        pipelineTag: info.pipeline_tag || info.pipelineTag,
        libraryName: info.library_name || info.libraryName,
        cardData: info.cardData,
        siblings: Array.isArray(info.siblings)
          ? info.siblings.map((sibling: any) => ({ rfilename: sibling.rfilename }))
          : undefined
      },
      message: `Retrieved info for ${ctx.input.repoType} **${ctx.input.repoId}**.`
    };
  })
  .build();

export let updateRepositoryVisibilityTool = SlateTool.create(spec, {
  name: 'Update Repository Visibility',
  key: 'update_repository_visibility',
  description: `Change a repository's visibility between public and private.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      private: z.boolean().describe('Set to true for private, false for public')
    })
  )
  .output(
    z.object({
      repoId: z.string().describe('Full repository ID'),
      private: z.boolean().describe('Updated visibility')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    await client.updateRepoVisibility({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      private: ctx.input.private
    });

    return {
      output: {
        repoId: ctx.input.repoId,
        private: ctx.input.private
      },
      message: `Updated **${ctx.input.repoId}** visibility to **${ctx.input.private ? 'private' : 'public'}**.`
    };
  })
  .build();

let refSchema = z.object({
  name: z.string().describe('Short ref name (e.g. "main", "v1.0", or a pull request number)'),
  ref: z.string().describe('Full Git ref (e.g. "refs/heads/main", "refs/pr/3")'),
  targetCommit: z.string().optional().describe('Commit SHA the ref points to')
});

let mapRefs = (refs: unknown) =>
  Array.isArray(refs)
    ? refs.map((ref: any) => ({
        name: String(ref.name),
        ref: String(ref.ref),
        targetCommit: ref.targetCommit ?? undefined
      }))
    : [];

export let listRepoRefsTool = SlateTool.create(spec, {
  name: 'List Repository Refs',
  key: 'list_repo_refs',
  description: `List the branches and tags of a model, dataset, or Space repository, and optionally its pull request refs. Use the returned names or refs as the revision for file, info, and commit operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      includePullRequests: z
        .boolean()
        .optional()
        .describe('Also return pull request refs (refs/pr/N)')
    })
  )
  .output(
    z.object({
      branches: z.array(refSchema).describe('Branches'),
      tags: z.array(refSchema).describe('Tags'),
      converts: z
        .array(refSchema)
        .describe('Automatically generated conversion refs (for example Parquet conversions)'),
      pullRequests: z
        .array(refSchema)
        .optional()
        .describe('Pull request refs, returned when includePullRequests is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });
    let refs = await client.listRepoRefs({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      includePullRequests: ctx.input.includePullRequests
    });

    let branches = mapRefs(refs?.branches);
    let tags = mapRefs(refs?.tags);

    return {
      output: {
        branches,
        tags,
        converts: mapRefs(refs?.converts),
        pullRequests: ctx.input.includePullRequests ? mapRefs(refs?.pullRequests) : undefined
      },
      message: `Found **${branches.length}** branch(es) and **${tags.length}** tag(s) in **${ctx.input.repoId}**.`
    };
  })
  .build();
