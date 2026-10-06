import { Slate } from 'slates';
import { spec } from './spec';
import {
  listGiftcardBrands,
  listHandwritingStyles,
  listTemplates,
  manageMailingLists,
  manageOrders,
  manageRecipients,
  manageSubAccounts,
  radiusSearch,
  sendGiftcard,
  sendLetter,
  sendNotecard,
  sendPostcard
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendPostcard,
    sendNotecard,
    sendLetter,
    sendGiftcard,
    manageRecipients,
    manageMailingLists,
    manageOrders,
    listTemplates,
    listHandwritingStyles,
    listGiftcardBrands,
    manageSubAccounts,
    radiusSearch
  ],
  triggers: []
});
