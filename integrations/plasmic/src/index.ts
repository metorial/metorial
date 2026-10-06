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
  triggers: []
});
