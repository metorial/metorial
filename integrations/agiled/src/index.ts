import { Slate } from 'slates';
import { spec } from './spec';

import {
  createContact,
  createContract,
  createDeal,
  createEmployee,
  createEstimate,
  createExpense,
  createInvoice,
  createProduct,
  createProject,
  createTask,
  createTicket,
  createTimeEntry,
  deleteContact,
  getContact,
  getContract,
  getDeal,
  getEmployee,
  getEstimate,
  getInvoice,
  getProduct,
  getProject,
  getTask,
  getTicket,
  getUser,
  updateContact,
  updateProject,
  updateTask
} from './tools';

import {
  inboundWebhook,
  newContactTrigger,
  newContractTrigger,
  newEmployeeTrigger,
  newEstimateTrigger,
  newInvoiceTrigger,
  newProductTrigger,
  newProjectTrigger,
  newTaskTrigger,
  newTicketTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    getContact,
    updateContact,
    deleteContact,
    createProject,
    getProject,
    updateProject,
    createTask,
    getTask,
    updateTask,
    createInvoice,
    getInvoice,
    createEstimate,
    getEstimate,
    createContract,
    getContract,
    createEmployee,
    getEmployee,
    createTicket,
    getTicket,
    createProduct,
    getProduct,
    createDeal,
    getDeal,
    getUser,
    createTimeEntry,
    createExpense
  ],
  triggers: [
    inboundWebhook,
    newContactTrigger,
    newProjectTrigger,
    newTaskTrigger,
    newInvoiceTrigger,
    newEstimateTrigger,
    newContractTrigger,
    newEmployeeTrigger,
    newTicketTrigger,
    newProductTrigger
  ]
});
