import { Slate } from 'slates';
import { spec } from './spec';
import { addUserToProduct, deleteUser, listProducts, removeUserFromProduct } from './tools';
import { membervaultEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listProducts, addUserToProduct, removeUserFromProduct, deleteUser],
  triggers: [membervaultEvent]
});
