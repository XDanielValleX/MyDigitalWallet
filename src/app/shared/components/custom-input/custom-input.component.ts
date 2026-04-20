import { Component, EventEmitter, Input, Output, Optional, Self } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
  standalone: false
})
export class CustomInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' | 'tel' | 'number' = 'text';
  @Input() placeholder = '';
  @Input() inputMode?: string;
  @Input() autocomplete?: string;
  @Input() maxlength?: number;
  @Input() minlength?: number;
  @Input() readonly = false;
  @Input() clearInput = false;

  /** Optional UI override */
  @Input() errorText?: string;

  @Output() ionInput = new EventEmitter<any>();
  @Output() ionBlur = new EventEmitter<void>();

  value = '';
  isDisabled = false;

  private onChange: (value: string) => void = () => { };
  private onTouched: () => void = () => { };

  constructor(@Optional() @Self() public ngControl: NgControl | null) {
    // Enables automatic status/error introspection when used with Reactive Forms.
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  writeValue(value: any): void {
    this.value = value == null ? '' : String(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  handleInput(ev: any) {
    const next = String(ev?.detail?.value ?? ev?.target?.value ?? '');
    this.value = next;
    this.onChange(next);
    this.ionInput.emit(ev);
  }

  handleBlur() {
    this.onTouched();
    this.ionBlur.emit();
  }

  get showError(): boolean {
    const control = this.ngControl?.control;
    if (!control) {
      return false;
    }
    return Boolean(control.invalid && (control.touched || control.dirty));
  }

  get computedErrorText(): string {
    if (this.errorText) {
      return this.errorText;
    }

    const errors = this.ngControl?.control?.errors;
    if (!errors) {
      return '';
    }

    if (errors['required']) return 'This field is required.';
    if (errors['email']) return 'Enter a valid email.';
    if (errors['minlength']) {
      const required = errors['minlength']?.requiredLength;
      return `Minimum ${required} characters.`;
    }
    if (errors['maxlength']) {
      const required = errors['maxlength']?.requiredLength;
      return `Maximum ${required} characters.`;
    }

    return 'Invalid value.';
  }
}
