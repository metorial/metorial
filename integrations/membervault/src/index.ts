import { Slate } from 'slates';
import { spec } from './spec';
import { addUserToProduct, deleteUser, listProducts, removeUserFromProduct } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listProducts, addUserToProduct, removeUserFromProduct, deleteUser],
  triggers: []
});
