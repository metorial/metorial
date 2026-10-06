import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

let chatOutputSchema = z.object({
  chatId: z.string().describe('Unique chat identifier'),
  name: z.string().optional().describe('User-assigned chat name'),
  privacy: z.string().describe('Chat visibility level'),
  createdAt: z.string().describe('ISO timestamp of creation'),
  updatedAt: z.string().optional().describe('ISO timestamp of last update'),
  authorId: z.string().optional().describe('Creator user ID'),
  projectId: z.string().optional().describe('Associated project ID'),
  webUrl: z.string().describe('URL to view the chat'),
  apiUrl: z.string().describe('API endpoint URL'),
  latestVersionId: z.string().optional().describe('ID of the latest generated version'),
  latestVersionStatus: z.string().optional().describe('Status of the latest version'),
  demoUrl: z.string().optional().describe('Demo URL for the latest version')
});

export let createChatTool = SlateTool.create(spec, {
  name: 'Create Chat',
  key: 'create_chat',
  description: `DEPRECATED — use \`create_current_chat\` instead. This tool uses API v1. Start a new AI code generation session by sending a natural language prompt to V0. The AI will generate web application code based on your message. Optionally provide system context, associate with a project, or configure privacy settings.`,
  instructions: [
    'Use create_current_chat for current API v2 chats. This tool operates only on API v1 chats; v1 IDs cannot be used with v2.',
    'The response includes the generated chat with its latest version containing the AI-generated code.',
    'Use the demoUrl to preview the generated application in an iframe.'
  ],
  tags: { deprecated: true }
})
  .input(
    z.object({
      message: z.string().min(1).describe('The prompt describing what to generate'),
      system: z
        .string()
        .optional()
        .describe('System-level context for frameworks, tools, or coding style'),
      projectId: z
        .string()
        .min(1)
        .optional()
        .describe('Associate chat with an existing project'),
      chatPrivacy: z
        .enum(['public', 'private', 'team-edit', 'team', 'unlisted'])
        .optional()
        .describe('Chat visibility setting'),
      responseMode: z
        .enum(['sync', 'async'])
        .optional()
        .describe('Whether to wait for the AI response (sync) or return immediately (async)'),
      designSystemId: z
        .string()
        .optional()
        .describe('Design system to apply to the generated UI'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata')
    })
  )
  .output(chatOutputSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.createChat({
      message: ctx.input.message,
      system: ctx.input.system,
      projectId: ctx.input.projectId,
      chatPrivacy: ctx.input.chatPrivacy,
      responseMode: ctx.input.responseMode,
      designSystemId: ctx.input.designSystemId,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        chatId: result.id,
        name: result.name,
        privacy: result.privacy,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        authorId: result.authorId,
        projectId: result.projectId,
        webUrl: result.webUrl,
        apiUrl: result.apiUrl,
        latestVersionId: result.latestVersion?.id,
        latestVersionStatus: result.latestVersion?.status,
        demoUrl: result.latestVersion?.demoUrl
      },
      message: `Created chat **${result.name || result.id}**. ${result.latestVersion?.demoUrl ? `[Preview](${result.latestVersion.demoUrl})` : ''}`
    };
  })
  .build();

export let initChatTool = SlateTool.create(spec, {
  name: 'Initialize Chat',
  key: 'init_chat',
  description: `DEPRECATED — use \`import_current_chat\` instead. This tool uses API v1. Initialize a new chat from existing source content such as files, a GitHub repository, a component registry, or a zip archive. This enables context-rich AI conversations based on your existing code.`,
  instructions: [
    'Use import_current_chat for current API v2 chats. This tool operates only on API v1 chats; v1 IDs cannot be used with v2.',
    'Set type to "files" when providing inline file content, "repo" for GitHub repos, "registry" for component registries, or "zip" for zip archives.',
    'When using type "repo", provide repoUrl with the GitHub repository URL.'
  ],
  tags: { deprecated: true }
})
  .input(
    z.object({
      type: z
        .enum(['files', 'repo', 'registry', 'zip'])
        .optional()
        .describe('Source content type'),
      name: z.string().min(1).optional().describe('Name for the chat session'),
      chatPrivacy: z
        .enum(['public', 'private', 'team-edit', 'team', 'unlisted'])
        .optional()
        .describe('Chat visibility setting'),
      projectId: z.string().min(1).optional().describe('Associate with an existing project'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata'),
      files: z
        .array(
          z.object({
            name: z.string().min(1).describe('File path (e.g., app/globals.css)'),
            content: z.string().describe('File content'),
            locked: z.boolean().optional().describe('Prevent AI from modifying this file')
          })
        )
        .optional()
        .describe('Inline files (when type is "files")'),
      repoUrl: z
        .string()
        .min(1)
        .optional()
        .describe('GitHub repository URL (when type is "repo")'),
      repoBranch: z.string().optional().describe('Git branch name (when type is "repo")'),
      registryUrl: z
        .string()
        .optional()
        .describe('Component registry URL (when type is "registry")'),
      zipUrl: z.string().min(1).optional().describe('ZIP archive URL (when type is "zip")'),
      lockAllFiles: z.boolean().optional().describe('Prevent AI from modifying all files'),
      templateId: z.string().min(1).optional().describe('Template ID from V0 system')
    })
  )
  .output(chatOutputSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);

    const sources = [
      ctx.input.files !== undefined,
      ctx.input.repoUrl !== undefined,
      ctx.input.registryUrl !== undefined,
      ctx.input.zipUrl !== undefined,
      ctx.input.templateId !== undefined
    ];
    if (sources.filter(Boolean).length !== 1)
      throw createApiServiceError(
        'Provide exactly one source: files, repoUrl, registryUrl, zipUrl, or templateId.'
      );
    const inferredType = ctx.input.files
      ? 'files'
      : ctx.input.repoUrl
        ? 'repo'
        : ctx.input.registryUrl
          ? 'registry'
          : ctx.input.zipUrl
            ? 'zip'
            : 'template';
    const type = ctx.input.type ?? inferredType;
    if (type !== inferredType)
      throw createApiServiceError('type must match the provided source.');
    if (ctx.input.files?.length === 0)
      throw createApiServiceError('Provide at least one source file.');
    if (ctx.input.repoBranch !== undefined && type !== 'repo')
      throw createApiServiceError('repoBranch requires repoUrl.');
    if (ctx.input.lockAllFiles !== undefined && (type === 'files' || type === 'template'))
      throw createApiServiceError(
        'lockAllFiles is supported only for repository, registry, and ZIP imports; use locked on individual files.'
      );
    const params: Parameters<V0Client['initChat']>[0] = {
      type,
      name: ctx.input.name,
      chatPrivacy: ctx.input.chatPrivacy,
      projectId: ctx.input.projectId,
      metadata: ctx.input.metadata,
      ...(type === 'files' ? { files: ctx.input.files } : {}),
      ...(type === 'repo'
        ? { repo: { url: ctx.input.repoUrl!, branch: ctx.input.repoBranch } }
        : {}),
      ...(type === 'registry' ? { registry: { url: ctx.input.registryUrl! } } : {}),
      ...(type === 'zip' ? { zip: { url: ctx.input.zipUrl! } } : {}),
      ...(type === 'template' ? { templateId: ctx.input.templateId } : {}),
      ...(ctx.input.lockAllFiles !== undefined ? { lockAllFiles: ctx.input.lockAllFiles } : {})
    };

    let result = await client.initChat(params);

    return {
      output: {
        chatId: result.id,
        name: result.name,
        privacy: result.privacy,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        authorId: result.authorId,
        projectId: result.projectId,
        webUrl: result.webUrl,
        apiUrl: result.apiUrl,
        latestVersionId: result.latestVersion?.id,
        latestVersionStatus: result.latestVersion?.status,
        demoUrl: result.latestVersion?.demoUrl
      },
      message: `Initialized chat **${result.name || result.id}** from ${ctx.input.type || 'source'} content.`
    };
  })
  .build();
