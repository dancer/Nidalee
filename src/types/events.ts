import { ChangeEvent, FormEvent } from 'react';

export interface FormInputEvent extends ChangeEvent<HTMLInputElement> {
  target: HTMLInputElement;
}

export interface FormSelectEvent extends ChangeEvent<HTMLSelectElement> {
  target: HTMLSelectElement;
}

export interface FormSubmitEvent extends FormEvent<HTMLFormElement> {
  preventDefault(): void;
} 