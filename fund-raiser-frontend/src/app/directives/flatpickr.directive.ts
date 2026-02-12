import { Directive, ElementRef, AfterViewInit, OnDestroy, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';
import { Options } from 'flatpickr/dist/types/options';

@Directive({
  selector: '[appFlatpickr]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlatpickrDirective),
      multi: true
    }
  ]
})
export class FlatpickrDirective implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() fpConfig: Partial<Options> = {};

  private fp: Instance | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private initialValue: string = '';

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit() {
    const el = this.el.nativeElement;
    // Switch from type="date" to type="text" so flatpickr controls the UI
    el.type = 'text';
    el.readOnly = true;

    this.fp = flatpickr(el, {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'M j, Y',
      disableMobile: true,
      ...this.fpConfig,
      onChange: (_selectedDates, dateStr) => {
        this.onChange(dateStr);
        this.onTouched();
      },
      onClose: () => {
        this.onTouched();
      }
    });

    // Copy Tailwind classes from the original input to flatpickr's alt input
    if (this.fp.altInput) {
      this.fp.altInput.className = el.className + ' cursor-pointer';
      this.fp.altInput.placeholder = el.placeholder || 'Select date';
    }

    // Apply initial value if one was set before flatpickr initialized
    if (this.initialValue) {
      this.fp.setDate(this.initialValue, false);
    }
  }

  writeValue(value: string): void {
    if (this.fp) {
      this.fp.setDate(value || '', false);
    } else {
      this.initialValue = value || '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.fp) {
      if (isDisabled) {
        this.fp.input.setAttribute('disabled', 'true');
      } else {
        this.fp.input.removeAttribute('disabled');
      }
    }
  }

  ngOnDestroy() {
    if (this.fp) {
      this.fp.destroy();
    }
  }
}
