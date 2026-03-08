import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';

@Component({
    selector: 'app-auth-input',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
    templateUrl: './auth-input.component.html',
    styleUrls: ['./auth-input.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => AuthInputComponent),
            multi: true
        }
    ]
})
export class AuthInputComponent implements ControlValueAccessor {
    @Input() label: string = '';
    @Input() type: 'text' | 'password' | 'email' | 'number' = 'text';
    @Input() placeholder: string = '';
    @Input() error: string | null = null;
    @Input() icon: string | null = null;

    value: string = '';
    isDisabled: boolean = false;
    isFocused: boolean = false;

    onChange: any = () => { };
    onTouch: any = () => { };

    writeValue(value: any): void {
        this.value = value || '';
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouch = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    onInput(event: Event): void {
        const el = event.target as HTMLInputElement;
        this.value = el.value;
        this.onChange(this.value);
    }

    onBlur(): void {
        this.isFocused = false;
        this.onTouch();
    }

    onFocus(): void {
        this.isFocused = true;
    }
}
