import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProduct,
  deleteProduct,
  getModelingRequest,
  getProduct,
  listModelingRequests,
  listProducts,
  listWorkspaces,
  updateProduct
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createProduct,
    getProduct,
    deleteProduct,
    listProducts,
    listWorkspaces,
    updateProduct,
    listModelingRequests,
    getModelingRequest
  ],
  triggers: []
});
