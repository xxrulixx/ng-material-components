import { inputBaseTemplate } from '../input-base/input-base.template';
import { Component, Input, OnInit, ElementRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { InputBase } from '../input-base/input-base.component';
import { CustomValidators } from '../validators/custom-validators';
import { ValidationInfo } from  '../../../models/validation-info';

@Component({
    selector: 'bw-password',
    template: inputBaseTemplate,
})
export class PasswordComponent extends InputBase implements OnInit {

    @Input() public fg: FormGroup;
    @Input() public placeholder: string;
    @Input() public field: string;
    @Input() public label: string;
    @Input() public floatingLabel: boolean;
    @Input() public leftIcon: string;
    @Input() public rightIcon: string;
    @Input() public disabled: boolean;
    @Input() public value: string;
    @Input() public alt: boolean;

    // validators
    @Input() public required: boolean;
    @Input() public min: number;
    @Input() public max: number;
    @Input() public enforceComplexity: boolean;

    public validations: ValidationInfo[];

    constructor(el: ElementRef) {
        super(el);
        // change text control to password
        this.inputType = 'password';
    }

    public addValidators(): void {

        if (this.enforceComplexity) {
            this.validations.push({
                validator: CustomValidators.complexPassword,
                type: 'weakPassword',
                message: `This password is not complex enough.
                It requires at least one of each: upper case letter,
                lower case letter, digit and a special character.
                Also it should be at least eight charaacters long.`,
            });
        } else {
            if (this.min) {
                this.validations.push(InputBase.minValidator(this.min));
            }

            if (this.max) {
                this.validations.push(InputBase.maxValidator(this.max));
            }
        }
    }

    public ngOnInit(): void {
        this.onInit();

        if (!this.leftIcon) {
            this.leftIcon = 'key';
        }
    }

    public ngOnDestroy(): void {

    }

}
