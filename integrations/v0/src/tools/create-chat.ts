import { SlateTool } from 'slates';
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
  description: `Start a new AI code generation session by sending a natural language prompt to V0. The AI will generate web application code based on your message. Optionally provide system context, associate with a project, or configure privacy settings.`,
  instructions: [
    'The response includes the generated chat with its latest version containing the AI-generated code.',
    'Use the demoUrl to preview the generated application in an iframe.'
  ]
})
  .input(
    z.object({
      message: z.string().describe('The prompt describing what to generate'),
      system: z
        .string()
        .optional()
        .describe('System-level context for frameworks, tools, or coding style'),
      projectId: z.string().optional().describe('Associate chat with an existing project'),
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
        .describe('Custom key-value metadata (max 50 pairs)')
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
      metadata: ctx.input.metadata as Record<string, string> | undefined
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
  description: `Initialize a new chat from existing source content such as files, a GitHub repository, a component registry, or a zip archive. This enables context-rich AI conversations based on your existing code.`,
  instructions: [
    'Set type to "files" when providing inline file content, "repo" for GitHub repos, "registry" for component registries, or "zip" for zip archives.',
    'When using type "repo", provide the repo.url field with the GitHub repository URL.'
  ]
})
  .input(
    z.object({
      type: z
        .enum(['files', 'repo', 'registry', 'zip'])
        .optional()
        .describe('Source content type'),
      name: z.string().optional().describe('Name for the chat session'),
      chatPrivacy: z
        .enum(['public', 'private', 'team-edit', 'team', 'unlisted'])
        .optional()
        .describe('Chat visibility setting'),
      projectId: z.string().optional().describe('Associate with an existing project'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata'),
      files: z
        .array(
          z.object({
            name: z.string().describe('File path (e.g., app/globals.css)'),
            content: z.string().describe('File content'),
            locked: z.boolean().optional().describe('Prevent AI from modifying this file')
          })
        )
        .optional()
        .describe('Inline files (when type is "files")'),
      repoUrl: z.string().optional().describe('GitHub repository URL (when type is "repo")'),
      repoBranch: z.string().optional().describe('Git branch name (when type is "repo")'),
      registryUrl: z
        .string()
        .optional()
        .describe('Component registry URL (when type is "registry")'),
      zipUrl: z.string().optional().describe('ZIP archive URL (when type is "zip")'),
      lockAllFiles: z.boolean().optional().describe('Prevent AI from modifying all files'),
      templateId: z.string().optional().describe('Template ID from V0 system')
    })
  )
  .output(chatOutputSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);

    let params: any = {
      type: ctx.input.type,
      name: ctx.input.name,
      chatPrivacy: ctx.input.chatPrivacy,
      projectId: ctx.input.projectId,
      metadata: ctx.input.metadata,
      files: ctx.input.files,
      lockAllFiles: ctx.input.lockAllFiles,
      templateId: ctx.input.templateId
    };

    if (ctx.input.repoUrl) {
      params.repo = { url: ctx.input.repoUrl, branch: ctx.input.repoBranch };
    }
    if (ctx.input.registryUrl) {
      params.registry = { url: ctx.input.registryUrl };
    }
    if (ctx.input.zipUrl) {
      params.zip = { url: ctx.input.zipUrl };
    }

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
