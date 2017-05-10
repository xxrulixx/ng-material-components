import {
    Component,
    Input,
    OnInit,
    ElementRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { InputBase } from '../input-base/input-base.component';
import autosize from './autosize';

// TODO: I need to comeback to this
// let autosize = require('autosize');

@Component({
    selector: 'bw-text-area',
    template: `
        <div class="text-area form-group m-b-25 w-100" [class.fc-alt]="alt"
            [ngClass]="{ 'has-error': !control.valid &amp;&amp; (fg.submitted || control.dirty)}">
            <label *ngIf="label">{{label}}</label>
            <div class="fg-line" [class.disabled]="disabled" [class.fg-toggled]="toggled">
                <textarea class="form-control auto-size" #i [attr.disabled]="disabled" 
                    placeholder="{{placeholder}}" [formControl]="control" (focus)="onFocus(i)" 
                    (blur)="onBlur(i)" [attr.rows]="rows"></textarea>
            </div>
            <div *ngIf="!control.valid &amp;&amp; (control.dirty || fg.submitted)">
                <small class="help-block animated fadeInDown" *ngFor="let v of validations"
                    [class.hidden]="!control.errors[v.type]">{{v.message}}</small>
            </div>
        </div>
    `,
})
export class TextAreaComponent extends InputBase implements OnInit {

    @Input() public fg: FormGroup;
    @Input() public placeholder: string;
    @Input() public field: string;
    @Input() public label: string;
    @Input() public floatingLabel: boolean;
    @Input() public leftIcon: string;
    @Input() public disabled: boolean;
    @Input() public value: string;
    @Input() public alt: boolean;

    // validators
    @Input() public required: boolean;
    @Input() public min: number;
    @Input() public max: number;
    @Input() public autosize: boolean = true;
    @Input() public rows: number = 3;

    constructor(el: ElementRef) {
        super(el);
    }

    public addValidators(): void {
        if (this.min) {
            this.validations.push(InputBase.minValidator(this.min));
        }

        if (this.max) {
            this.validations.push(InputBase.maxValidator(this.max));
        }
    }

    public ngOnInit(): void {
        this.onInit();

        if (this.autosize) {
            autosize(this.ele.nativeElement.getElementsByClassName('form-control'));
        }
    }

}
