import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import {
  createBranch,
  createRepository,
  getGlobalSecurityAdvisory,
  getRepositoryTree,
  listGlobalSecurityAdvisories,
  listIssues,
  mergePullRequest,
  pushFiles,
  starRepository,
  subIssueWrite,
  updatePullRequestBranch
} from './tools';

const addedToolKeys = [
  'search_commits',
  'run_secret_scanning',
  'pull_request_read',
  'list_tags',
  'list_releases',
  'list_issue_types',
  'list_issue_fields',
  'issue_read',
  'get_teams',
  'get_team_members',
  'get_tag',
  'get_release_by_tag',
  'get_latest_release',
  'get_label',
  'get_file_contents',
  'get_commit',
  'create_branch',
  'push_files',
  'get_repository_tree',
  'update_pull_request_branch',
  'sub_issue_write',
  'get_global_security_advisory',
  'list_global_security_advisories',
  'get_code_scanning_alert',
  'list_code_scanning_alerts',
  'get_dependabot_alert',
  'list_dependabot_alerts',
  'get_secret_scanning_alert',
  'list_secret_scanning_alerts',
  'list_repository_security_advisories',
  'list_org_repository_security_advisories',
  'get_code_quality_finding',
  'fork_repository',
  'list_starred_repositories',
  'get_notification_details',
  'list_notifications',
  'manage_notification_subscription',
  'manage_repository_notification_subscription',
  'mark_all_notifications_read',
  'dismiss_notification',
  'list_discussion_categories',
  'list_discussions',
  'get_discussion',
  'get_discussion_comments',
  'discussion_comment_write',
  'projects_get',
  'projects_list',
  'projects_write'
] as const;

describeMcpCompatibleToolSchemas('GitHub tool input schemas', provider.actions);

describe('GitHub tool registration', () => {
  it('registers each added tool exactly once', () => {
    const toolKeys = provider.actions
      .filter(action => action.type === 'tool')
      .map(action => action.key);

    for (const key of addedToolKeys) {
      expect(toolKeys.filter(candidate => candidate === key)).toHaveLength(1);
    }
  });

  it('keeps every production tool ID below 60 characters', () => {
    const toolKeys = provider.actions
      .filter(action => action.type === 'tool')
      .map(action => action.key);

    expect(new Set(toolKeys).size).toBe(toolKeys.length);
    for (const key of toolKeys) {
      expect(`github-${key}`.length).toBeLessThan(60);
    }
  });

  it('keeps synced write-tool schemas aligned with their public contracts', () => {
    let createSchema = z.toJSONSchema((createRepository as any).inputSchema) as any;
    expect(Object.keys(createSchema.properties)).toEqual([
      'name',
      'description',
      'private',
      'autoInit',
      'organization'
    ]);
    expect(createSchema.properties.private.default).toBe(true);
    expect(createSchema.required).toEqual(['name']);

    let mergeSchema = z.toJSONSchema((mergePullRequest as any).inputSchema) as any;
    expect(Object.keys(mergeSchema.properties)).toEqual([
      'owner',
      'repo',
      'pullNumber',
      'commit_title',
      'commit_message',
      'merge_method'
    ]);
    expect(mergeSchema.required).toEqual(['owner', 'repo', 'pullNumber']);

    let starSchema = z.toJSONSchema((starRepository as any).inputSchema) as any;
    expect(starSchema.required).toEqual(['owner', 'repo', 'action']);
    expect(starSchema.properties.action.enum).toEqual(['star', 'unstar']);
  });

  it('advertises cursor-based issue listing without legacy REST filters', () => {
    let schema = z.toJSONSchema((listIssues as any).inputSchema) as any;
    expect(Object.keys(schema.properties)).toEqual([
      'owner',
      'repo',
      'state',
      'labels',
      'orderBy',
      'direction',
      'since',
      'field_filters',
      'perPage',
      'after'
    ]);
    expect(schema.properties.state.enum).toEqual(['OPEN', 'CLOSED']);
    expect(schema.properties.labels.type).toBe('array');
    expect(schema.properties.field_filters.items.required).toEqual(['field_name', 'value']);
    expect(schema.properties).not.toHaveProperty('page');
    expect(schema.properties).not.toHaveProperty('assignee');
    expect(schema.properties).not.toHaveProperty('sort');
  });

  it('matches the official schemas for the added repository and issue write tools', () => {
    let createBranchSchema = z.toJSONSchema((createBranch as any).inputSchema) as any;
    expect(Object.keys(createBranchSchema.properties)).toEqual([
      'owner',
      'repo',
      'branch',
      'from_branch'
    ]);
    expect(createBranchSchema.required).toEqual(['owner', 'repo', 'branch']);

    let pushFilesSchema = z.toJSONSchema((pushFiles as any).inputSchema) as any;
    expect(Object.keys(pushFilesSchema.properties)).toEqual([
      'owner',
      'repo',
      'branch',
      'files',
      'message'
    ]);
    expect(pushFilesSchema.required).toEqual(['owner', 'repo', 'branch', 'files', 'message']);
    expect(pushFilesSchema.properties.files.items.required).toEqual(['path', 'content']);
    expect(pushFilesSchema.properties.files.items.additionalProperties).toBe(false);

    let updateBranchSchema = z.toJSONSchema(
      (updatePullRequestBranch as any).inputSchema
    ) as any;
    expect(Object.keys(updateBranchSchema.properties)).toEqual([
      'owner',
      'repo',
      'pullNumber',
      'expectedHeadSha'
    ]);
    expect(updateBranchSchema.required).toEqual(['owner', 'repo', 'pullNumber']);

    let subIssueSchema = z.toJSONSchema((subIssueWrite as any).inputSchema) as any;
    expect(Object.keys(subIssueSchema.properties)).toEqual([
      'method',
      'owner',
      'repo',
      'issue_number',
      'sub_issue_id',
      'replace_parent',
      'after_id',
      'before_id'
    ]);
    expect(subIssueSchema.required).toEqual([
      'method',
      'owner',
      'repo',
      'issue_number',
      'sub_issue_id'
    ]);
    expect(subIssueSchema.properties.method).not.toHaveProperty('enum');
  });

  it('matches the official schemas for repository tree and global advisories', () => {
    let treeSchema = z.toJSONSchema((getRepositoryTree as any).inputSchema) as any;
    expect(Object.keys(treeSchema.properties)).toEqual([
      'owner',
      'repo',
      'tree_sha',
      'recursive',
      'path_filter'
    ]);
    expect(treeSchema.required).toEqual(['owner', 'repo']);
    expect(treeSchema.properties.recursive.default).toBe(false);

    let getAdvisorySchema = z.toJSONSchema(
      (getGlobalSecurityAdvisory as any).inputSchema
    ) as any;
    expect(Object.keys(getAdvisorySchema.properties)).toEqual(['ghsaId']);
    expect(getAdvisorySchema.required).toEqual(['ghsaId']);

    let listAdvisoriesSchema = z.toJSONSchema(
      (listGlobalSecurityAdvisories as any).inputSchema
    ) as any;
    expect(Object.keys(listAdvisoriesSchema.properties)).toEqual([
      'ghsaId',
      'type',
      'cveId',
      'ecosystem',
      'severity',
      'cwes',
      'isWithdrawn',
      'affects',
      'published',
      'updated',
      'modified'
    ]);
    expect(listAdvisoriesSchema.required).toBeUndefined();
    expect(listAdvisoriesSchema.properties.type.default).toBe('reviewed');
  });
});
