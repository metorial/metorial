import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

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
        .describe('SDK for Spaces (required for space type)'),
      license: z.string().optional().describe('License identifier (e.g. "mit", "apache-2.0")')
    })
  )
  .output(
    z.object({
      url: z.string().describe('URL of the created repository'),
      repoId: z.string().optional().describe('Full repository ID')
    })
  )
  .handleInvocation(async ctx => {
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
        repoId: result.repoId || result.id
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
      organization: z.string().optional().describe('Organization namespace if applicable')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the repository was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    await client.deleteRepo({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      organization: ctx.input.organization
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
  description: `Duplicate a Hugging Face Space repository to a new Space. The current Hub API exposes repository duplication for Spaces.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z
        .enum(['space'])
        .default('space')
        .describe(
          'Repository type to duplicate. Hugging Face currently supports Space duplication.'
        ),
      sourceRepoId: z.string().describe('Source Space ID (e.g. "owner/source-space")'),
      destinationRepoId: z
        .string()
        .describe('Destination Space ID or name for the duplicated repository'),
      private: z
        .boolean()
        .optional()
        .describe('Whether the duplicated Space should be private'),
      visibility: z
        .enum(['private', 'public', 'protected'])
        .optional()
        .describe('Visibility for the duplicated Space'),
      hardware: z
        .string()
        .optional()
        .describe('Optional hardware flavor for the duplicated Space'),
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
    let client = new HubClient({ token: ctx.auth.token });
    let result = await client.duplicateSpace({
      sourceRepoId: ctx.input.sourceRepoId,
      destinationRepoId: ctx.input.destinationRepoId,
      private: ctx.input.private,
      visibility: ctx.input.visibility,
      hardware: ctx.input.hardware,
      sleepTimeSeconds: ctx.input.sleepTimeSeconds
    });

    return {
      output: {
        url: result.url,
        repoId: ctx.input.destinationRepoId
      },
      message: `Duplicated Space **${ctx.input.sourceRepoId}** to **${ctx.input.destinationRepoId}**.`
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
        siblings: info.siblings
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
