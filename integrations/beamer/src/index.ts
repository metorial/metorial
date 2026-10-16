import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCommentTool,
  addReactionTool,
  checkNpsTool,
  createFeatureRequestTool,
  createPostTool,
  deleteFeatureRequestTool,
  deletePostTool,
  getAccountTool,
  getFeatureRequestTool,
  getFeedUrlTool,
  getPostTool,
  getUnreadCountTool,
  listCommentsTool,
  listFeatureRequestsTool,
  listFeatureRequestVotesTool,
  listNpsResponsesTool,
  listPostsTool,
  listReactionsTool,
  updateFeatureRequestTool,
  updatePostTool,
  voteFeatureRequestTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccountTool,
    getFeedUrlTool,
    getFeatureRequestTool,
    listCommentsTool,
    listReactionsTool,
    listFeatureRequestVotesTool,
    createPostTool,
    updatePostTool,
    getPostTool,
    listPostsTool,
    deletePostTool,
    addCommentTool,
    addReactionTool,
    createFeatureRequestTool,
    updateFeatureRequestTool,
    listFeatureRequestsTool,
    deleteFeatureRequestTool,
    voteFeatureRequestTool,
    getUnreadCountTool,
    checkNpsTool,
    listNpsResponsesTool
  ],
  triggers: []
});
