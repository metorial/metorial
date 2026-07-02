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
  getPostTool,
  getUnreadCountTool,
  listFeatureRequestsTool,
  listNpsResponsesTool,
  listPostsTool,
  updateFeatureRequestTool,
  updatePostTool,
  voteFeatureRequestTool
} from './tools';
import {
  newCommentTrigger,
  newNpsScoreTrigger,
  newPostTrigger,
  newReactionTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [newPostTrigger, newCommentTrigger, newReactionTrigger, newNpsScoreTrigger]
});
