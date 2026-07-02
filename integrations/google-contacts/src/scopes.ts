import { allOf, anyOf } from 'slates';

export let googleContactsScopes = {
  contacts: 'https://www.googleapis.com/auth/contacts',
  contactsReadonly: 'https://www.googleapis.com/auth/contacts.readonly',
  contactsOtherReadonly: 'https://www.googleapis.com/auth/contacts.other.readonly',
  directoryReadonly: 'https://www.googleapis.com/auth/directory.readonly',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

export let googleContactsActionScopes = {
  createContact: anyOf(googleContactsScopes.contacts),
  getContact: anyOf(googleContactsScopes.contacts, googleContactsScopes.contactsReadonly),
  updateContact: anyOf(googleContactsScopes.contacts),
  deleteContact: anyOf(googleContactsScopes.contacts),
  listContacts: anyOf(googleContactsScopes.contacts, googleContactsScopes.contactsReadonly),
  searchContacts: anyOf(googleContactsScopes.contacts, googleContactsScopes.contactsReadonly),
  createContactGroup: anyOf(googleContactsScopes.contacts),
  updateContactGroup: anyOf(googleContactsScopes.contacts),
  deleteContactGroup: anyOf(googleContactsScopes.contacts),
  listContactGroups: anyOf(
    googleContactsScopes.contacts,
    googleContactsScopes.contactsReadonly
  ),
  getContactGroup: anyOf(googleContactsScopes.contacts, googleContactsScopes.contactsReadonly),
  modifyGroupMembers: anyOf(googleContactsScopes.contacts),
  listOtherContacts: anyOf(
    googleContactsScopes.contacts,
    googleContactsScopes.contactsReadonly,
    googleContactsScopes.contactsOtherReadonly
  ),
  searchOtherContacts: anyOf(
    googleContactsScopes.contacts,
    googleContactsScopes.contactsReadonly,
    googleContactsScopes.contactsOtherReadonly
  ),
  copyOtherContact: allOf(
    googleContactsScopes.contacts,
    googleContactsScopes.contactsOtherReadonly
  ),
  searchDirectory: anyOf(googleContactsScopes.directoryReadonly),
  inboundWebhook: anyOf(googleContactsScopes.contactsReadonly, googleContactsScopes.contacts),
  contactChanged: anyOf(googleContactsScopes.contacts, googleContactsScopes.contactsReadonly)
} as const;
