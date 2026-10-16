import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelBooking,
  captureBooking,
  createBooking,
  getBooking,
  getInventory,
  getProduct,
  listCategories,
  listCities,
  listCollections,
  rescheduleBooking,
  searchProducts
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchProducts,
    getProduct,
    getInventory,
    createBooking,
    getBooking,
    listCities,
    listCategories,
    listCollections,
    captureBooking,
    cancelBooking,
    rescheduleBooking
  ],
  triggers: []
});
