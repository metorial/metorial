import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  browseSourceTool,
  commentOnPullRequestTool,
  createCommitStatusTool,
  createPullRequestTool,
  createRepositoryTool,
  deleteRepositoryTool,
  forkRepositoryTool,
  getPullRequestTool,
  getRepositoryTool,
  listCommitsTool,
  listPullRequestCommentsTool,
  listPullRequestsTool,
  listRepositoriesTool,
  listWorkspaceMembersTool,
  manageBranchesTool,
  manageBranchRestrictionsTool,
  manageDefaultReviewersTool,
  managePipelinesTool,
  manageProjectsTool,
  managePullRequestTool,
  manageTagsTool,
  manageWebhooksTool,
  searchCodeTool,
  updateRepositoryTool
} from './tools';
import { pullRequestEventsTrigger, repositoryEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRepositoriesTool,
    getRepositoryTool,
    createRepositoryTool,
    updateRepositoryTool,
    deleteRepositoryTool,
    forkRepositoryTool,
    listPullRequestsTool,
    getPullRequestTool,
    createPullRequestTool,
    managePullRequestTool,
    commentOnPullRequestTool,
    listPullRequestCommentsTool,
    manageBranchesTool,
    manageTagsTool,
    listCommitsTool,
    managePipelinesTool,
    browseSourceTool,
    searchCodeTool,
    listWorkspaceMembersTool,
    manageProjectsTool,
    createCommitStatusTool,
    manageWebhooksTool,
    manageDefaultReviewersTool,
    manageBranchRestrictionsTool
  ],
  triggers: [repositoryEventsTrigger, pullRequestEventsTrigger]
});
