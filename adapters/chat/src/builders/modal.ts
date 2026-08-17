import type {
  DateInputPart,
  Modal,
  ModalChild,
  NumberInputPart,
  TextInputPart
} from '../schema/interactions/modal';

export let textInput = (options: {
  id: string;
  label: string;
  initialValue?: string;
  maxLength?: number;
  multiline?: boolean;
  optional?: boolean;
  placeholder?: string;
}): TextInputPart => ({
  type: 'text_input',
  id: options.id,
  label: options.label,
  initialValue: options.initialValue,
  maxLength: options.maxLength,
  multiline: options.multiline,
  optional: options.optional,
  placeholder: options.placeholder
});

export let dateInput = (options: {
  id: string;
  label: string;
  initialValue?: string;
  optional?: boolean;
  placeholder?: string;
}): DateInputPart => ({
  type: 'date_input',
  id: options.id,
  label: options.label,
  initialValue: options.initialValue,
  optional: options.optional,
  placeholder: options.placeholder
});

export let numberInput = (options: {
  id: string;
  label: string;
  decimal?: boolean;
  initialValue?: number;
  max?: number;
  min?: number;
  optional?: boolean;
  placeholder?: string;
}): NumberInputPart => ({
  type: 'number_input',
  id: options.id,
  label: options.label,
  decimal: options.decimal,
  initialValue: options.initialValue,
  max: options.max,
  min: options.min,
  optional: options.optional,
  placeholder: options.placeholder
});

export let modal = (options: {
  title: string;
  callbackId: string;
  callbackUrl?: string;
  submitLabel?: string;
  closeLabel?: string;
  notifyOnClose?: boolean;
  privateMetadata?: string;
  children?: ModalChild[];
}): Modal => ({
  type: 'modal',
  title: options.title,
  callbackId: options.callbackId,
  callbackUrl: options.callbackUrl,
  submitLabel: options.submitLabel,
  closeLabel: options.closeLabel,
  notifyOnClose: options.notifyOnClose,
  privateMetadata: options.privateMetadata,
  children: options.children ?? []
});
