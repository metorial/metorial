import { Slate } from 'slates';
import { spec } from './spec';
import {
  addUserToProduct,
  deleteUser,
  getCourses,
  listProducts,
  removeUserFromProduct
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [listProducts, getCourses, addUserToProduct, removeUserFromProduct, deleteUser],
  triggers: []
});
