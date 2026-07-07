import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSonarQubeClient, projectKeyFor, type SonarConfig } from '../lib/client';
import { spec } from '../spec';

export let createClient = (ctx: { auth: { token: string }; config: SonarConfig }) =>
  createSonarQubeClient({
    auth: ctx.auth,
    config: ctx.config
  });

export let projectInput = {
  projectKey: z
    .string()
    .optional()
    .describe(
      'Exact SonarQube project key. Use search_my_sonarqube_projects first when the user gave a project name, partial key, or stale-looking key. Omit only when intentionally using a configured defaultProjectKey.'
    )
};

export let branchPullRequestInputs = {
  branch: z
    .string()
    .optional()
    .describe(
      "Long-lived branch name in SonarQube (e.g. 'main', 'develop'). Use list_branches to discover valid names. Not for feature branches or pull request analysis — use pullRequest instead."
    ),
  pullRequest: z
    .string()
    .optional()
    .describe(
      'Pull request key/ID in SonarQube. Use list_pull_requests to discover valid keys. Not for long-lived branches — use branch instead. Must be the SonarQube PR key, not a git branch name.'
    )
};

export let createSonarTool = (params: {
  name: string;
  key: string;
  description: string;
  instructions?: string[];
  readOnly?: boolean;
  destructive?: boolean;
}) =>
  SlateTool.create(spec, {
    name: params.name,
    key: params.key,
    description: params.description,
    instructions: params.instructions,
    tags: {
      readOnly: params.readOnly ?? true,
      destructive: params.destructive ?? false
    }
  });

export let readOnlyTool = (params: {
  name: string;
  key: string;
  description: string;
  instructions?: string[];
}) => createSonarTool(params);

export let projectKeyFromInput = (config: SonarConfig, input: { projectKey?: string }) =>
  projectKeyFor(config, input.projectKey);
