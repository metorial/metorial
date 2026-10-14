import { Slate } from 'slates';
import { spec } from './spec';
import {
  countCmsItems,
  createCmsItem,
  createCmsItems,
  deleteCmsItem,
  getCmsItem,
  getProjectModel,
  listCmsModels,
  publishCmsItem,
  queryCmsItems,
  renderComponent,
  updateCmsItem,
  updateProject
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listCmsModels,
    getCmsItem,
    queryCmsItems,
    countCmsItems,
    createCmsItem,
    createCmsItems,
    updateCmsItem,
    deleteCmsItem,
    publishCmsItem,
    renderComponent,
    getProjectModel,
    updateProject
  ],
  triggers: []
});
