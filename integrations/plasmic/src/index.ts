import { Slate } from 'slates';
import { spec } from './spec';
import {
  countCmsItems,
  createCmsItem,
  deleteCmsItem,
  getProjectModel,
  publishCmsItem,
  queryCmsItems,
  renderComponent,
  updateCmsItem,
  updateProject
} from './tools';
import { cmsPublish, projectPublish } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    queryCmsItems,
    countCmsItems,
    createCmsItem,
    updateCmsItem,
    deleteCmsItem,
    publishCmsItem,
    renderComponent,
    getProjectModel,
    updateProject
  ],
  triggers: [projectPublish, cmsPublish]
});
