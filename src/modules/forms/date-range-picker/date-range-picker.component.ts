import { Component, OnInit, OnDestroy, Input, ElementRef, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IDateRangePickerLocale } from './date-range-picker-locale';
import { pickerTemplate } from './date-range-picker.helper';
import { InputBase } from '../input-base/input-base.component';
import { DateRange } from '../../../models/date-range';
import * as $ from 'jquery';
import * as moment from 'moment/moment';

/* tslint:disable */

// declare let $: any;
declare let JQuery: any;

@Component({
    selector: 'bw-date-range-picker',
    templateUrl: '../input-base/input-base.component.pug',
})
export class DateRangePickerComponent extends InputBase implements OnInit, OnDestroy {

    @Input() public fg: FormGroup;
    @Input() public placeholder: string;
    @Input() public field: string;
    @Input() public label: string;

    @Input() public parentEl: JQuery = $('body');
    @Input() public startDate: any = moment().startOf('day').toString();
    @Input() public endDate: any = moment().endOf('day').toString();
    @Input() public minDate: any;
    @Input() public maxDate: any;
    @Input() public dateLimit: boolean | object = false;
    @Input() public autoApply: boolean = false;
    @Input() public singleDatePicker: boolean = false;
    @Input() public showDropdowns: boolean = false;
    @Input() public showWeekNumbers: boolean = false;
    @Input() public showISOWeekNumbers: boolean = false;
    @Input() public showCustomRangeLabel: boolean = true;
    @Input() public timePicker: boolean = false;
    @Input() public timePicker24Hour: boolean = false;
    @Input() public timePickerIncrement: number = 1;
    @Input() public timePickerSeconds: boolean = false;
    @Input() public linkedCalendars: boolean = true;
    @Input() public autoUpdateInput: boolean = true;
    @Input() public alwaysShowCalendars: boolean = false;
    @Input() public ranges: any = {};
    @Input() public buttonClasses: string = 'btn btn-sm';
    @Input() public applyClass: string = 'btn-success';
    @Input() public cancelClass: string = 'btn-default';
    @Input() public template: string | JQuery;
    @Input() public locale: IDateRangePickerLocale;
    @Input() public opens: string; // 'left'/'right'/'center'
    @Input() public drops: string; // 'down' or 'up'

    @Output() public rangeChanged = new EventEmitter<DateRange>();

    private element: JQuery;
    private container: JQuery;

    // other options
    private callback: (startDate: moment.Moment, endDate: moment.Moment, choseenLabel: string) => void;
    private isShowing: boolean = false;
    private leftCalendar: any = {};
    private rightCalendar: any = {};
    private _outsideClickProxy: any;
    private oldStartDate: moment.Moment;
    private oldEndDate: moment.Moment;
    private previousRightTime: moment.Moment;
    private chosenLabel: string;

    constructor(public ele: ElementRef) {
        super(ele);
    }

    public ngOnInit() {
        this.onInit();

        this.element = $(this.ele.nativeElement).find('.form-control');

        if (this.element.hasClass('dropup')) {
            this.drops = 'up';
        }

        this.locale = {
            direction: 'ltr',
            format: 'MM/DD/YYYY',
            separator: ' - ',
            applyLabel: 'Apply',
            cancelLabel: 'Cancel',
            weekLabel: 'W',
            customRangeLabel: 'Custom Range',
            daysOfWeek: moment.weekdaysMin(),
            monthNames: moment.monthsShort(),
            firstDay: moment.localeData().firstDayOfWeek(),
        };

        this.callback = function() {};

        // allow setting options with data attributes
        // data-api options will be overwritten with custom javascript options
        // this.options = $.extend(this.element.data(), options);

        // check if we need to use a custom template
        if (typeof this.template !== 'string' && !(this.template instanceof $)) {
            this.template = pickerTemplate;
        }

        // find out the parent element
        // this.parentEl = (this.parentEl && $(this.parentEl).length)
        //     ? $(this.parentEl) : $(this.parentEl);

        // check if the template does not exist in parentEL yet
        let container: any = this.parentEl.find('.daterangepicker');

        if (container.length === 0) {
            this.container = $(this.template).appendTo(this.parentEl);
        } else {
            this.container = container;
        }

        this._handleOverrides();
        this._processInitialValues();

        // if (typeof cb === 'function') {
        //     this.callback = cb;
        // }

        this._processTimePicker();

        if (this.autoApply && typeof this.ranges !== 'object') {
            this.container.find('.ranges').hide();
        } else if (this.autoApply) {
            this.container.find('.applyBtn, .cancelBtn').addClass('hide');
        }

        this._processSingleDatePicker();

        if ((typeof this.ranges === 'undefined' && !this.singleDatePicker) || this.alwaysShowCalendars) {
            this.container.addClass('show-calendar');
        }

        this.container.addClass('opens' + this.opens);

        // swap the position of the predefined ranges if opens right
        if (typeof this.ranges !== 'undefined' && this.opens === 'right') {
            this.container.find('.ranges').prependTo( this.container.find('.calendar.left').parent() );
        }

        this._processCssForLabelsAndButtons();
        this._processEventListeners();
        this._processInitialValue();

    }

    public ngOnDestroy() {
        this.remove();
    }

    public addValidators(): void { }

    private _handleOverrides(): void {

        if (typeof this.locale === 'object') {

            if (typeof this.locale.direction === 'string') {
                this.locale.direction = this.locale.direction;
            }

            if (typeof this.locale.format === 'string') {
                this.locale.format = this.locale.format;
            }

            if (typeof this.locale.separator === 'string') {
                this.locale.separator = this.locale.separator;
            }

            if (typeof this.locale.daysOfWeek === 'object') {
                this.locale.daysOfWeek = this.locale.daysOfWeek.slice();
            }

            if (typeof this.locale.monthNames === 'object') {
                this.locale.monthNames = this.locale.monthNames.slice();
            }

            if (typeof this.locale.firstDay === 'number') {
                this.locale.firstDay = this.locale.firstDay;
            }

            if (typeof this.locale.applyLabel === 'string') {
                this.locale.applyLabel = this.locale.applyLabel;
            }

            if (typeof this.locale.cancelLabel === 'string') {
                this.locale.cancelLabel = this.locale.cancelLabel;
            }

            if (typeof this.locale.weekLabel === 'string') {
                this.locale.weekLabel = this.locale.weekLabel;
            }

            if (typeof this.locale.customRangeLabel === 'string') {
                this.locale.customRangeLabel = this.locale.customRangeLabel;
            }

        }
        this.container.addClass(this.locale.direction);

        if (typeof this.startDate === 'string') {
            this.startDate = moment(this.startDate, this.locale.format);
        }

        if (typeof this.endDate === 'string') {
            this.endDate = moment(this.endDate, this.locale.format);
        }

        if (typeof this.minDate === 'string') {
            this.minDate = moment(this.minDate, this.locale.format);
        }

        if (typeof this.maxDate === 'string') {
            this.maxDate = moment(this.maxDate, this.locale.format);
        }

        if (typeof this.startDate === 'object') {
            this.startDate = moment(this.startDate);
        }

        if (typeof this.endDate === 'object') {
            this.endDate = moment(this.endDate);
        }

        if (typeof this.minDate === 'object') {
            this.minDate = moment(this.minDate);
        }

        if (typeof this.maxDate === 'object') {
            this.maxDate = moment(this.maxDate);
        }

        // sanity check for bad options
        if (this.minDate && this.startDate.isBefore(this.minDate)) {
            this.startDate = this.minDate.clone();
        }

        // sanity check for bad options
        if (this.maxDate && this.endDate.isAfter(this.maxDate)) {
            this.endDate = this.maxDate.clone();
        }

        if (typeof this.applyClass === 'string') {
            this.applyClass = this.applyClass;
        }

        if (typeof this.cancelClass === 'string') {
            this.cancelClass = this.cancelClass;
        }

        if (typeof this.dateLimit === 'object') {
            this.dateLimit = this.dateLimit;
        }

        if (typeof this.opens === 'string') {
            this.opens = this.opens;
        }

        if (typeof this.drops === 'string') {
            this.drops = this.drops;
        }

        if (typeof this.showWeekNumbers === 'boolean') {
            this.showWeekNumbers = this.showWeekNumbers;
        }

        if (typeof this.showISOWeekNumbers === 'boolean') {
            this.showISOWeekNumbers = this.showISOWeekNumbers;
        }

        if (typeof this.buttonClasses === 'string') {
            this.buttonClasses = this.buttonClasses;
        }

        if (typeof this.buttonClasses === 'object') {
            this.buttonClasses = (<any>this.buttonClasses).join(' ');
        }

        if (typeof this.showDropdowns === 'boolean') {
            this.showDropdowns = this.showDropdowns;
        }

        if (typeof this.showCustomRangeLabel === 'boolean') {
            this.showCustomRangeLabel = this.showCustomRangeLabel;
        }

        if (typeof this.singleDatePicker === 'boolean') {
            this.singleDatePicker = this.singleDatePicker;
            if (this.singleDatePicker) {
                this.endDate = this.startDate.clone();
            }
        }

        if (typeof this.timePicker === 'boolean') {
            this.timePicker = this.timePicker;
        }

        if (typeof this.timePickerSeconds === 'boolean') {
            this.timePickerSeconds = this.timePickerSeconds;
        }

        if (typeof this.timePickerIncrement === 'number') {
            this.timePickerIncrement = this.timePickerIncrement;
        }

        if (typeof this.timePicker24Hour === 'boolean') {
            this.timePicker24Hour = this.timePicker24Hour;
        }

        if (typeof this.autoApply === 'boolean') {
            this.autoApply = this.autoApply;
        }

        if (typeof this.autoUpdateInput === 'boolean') {
            this.autoUpdateInput = this.autoUpdateInput;
        }

        if (typeof this.linkedCalendars === 'boolean') {
            this.linkedCalendars = this.linkedCalendars;
        }

        if (typeof this.isInvalidDate === 'function') {
            this.isInvalidDate = this.isInvalidDate;
        }

        if (typeof this.isCustomDate === 'function') {
            this.isCustomDate = this.isCustomDate;
        }

        if (typeof this.alwaysShowCalendars === 'boolean') {
            this.alwaysShowCalendars = this.alwaysShowCalendars;
        }

        // update day names order to firstDay
        if (this.locale.firstDay !== 0) {
            let iterator = this.locale.firstDay;
            while (iterator > 0) {
                this.locale.daysOfWeek.push(this.locale.daysOfWeek.shift() || '');
                iterator--;
            }
        }

    }

    private _processInitialValues(): void {
        let start: moment.Moment = moment();
        let end: moment.Moment = moment();

        // if no start/end dates set, check if an input element contains initial values
        if (typeof this.startDate === 'undefined' && typeof this.endDate === 'undefined') {
            if ($(this.element).is('input[type=text]')) {
                const val = $(this.element).val();
                const split = val.split(this.locale.separator);

                if (split.length === 2) {
                    start = moment(split[0], this.locale.format);
                    end = moment(split[1], this.locale.format);
                } else if (this.singleDatePicker && val !== '') {
                    start = moment(val, this.locale.format);
                    end = moment(val, this.locale.format);
                }
                if (start !== null && end !== null) {
                    this.setStartDate(start);
                    this.setEndDate(end);
                }
            }
        }

        if (typeof this.ranges === 'object') {
            // for (let range in this.ranges) {
            for (let i = 0; i < this.ranges.length; i++) {
                const range = this.ranges[i];

                if (typeof this.ranges[range][0] === 'string') {
                    start = moment(this.ranges[range][0], this.locale.format);
                } else {
                    start = moment(this.ranges[range][0]);
                }

                if (typeof this.ranges[range][1] === 'string') {
                    end = moment(this.ranges[range][1], this.locale.format);
                } else {
                    end = moment(this.ranges[range][1]);
                }

                // If the start or end date exceed those allowed by the minDate or dateLimit
                // options, shorten the range to the allowable period.
                if (this.minDate && start.isBefore(this.minDate)) {
                    start = this.minDate.clone();
                }

                let maxDate = this.maxDate;
                if (this.dateLimit && maxDate && start.clone().add(this.dateLimit).isAfter(maxDate)) {
                    maxDate = start.clone().add(this.dateLimit);
                }

                if (maxDate && end.isAfter(maxDate)) {
                    end = maxDate.clone();
                }

                // If the end of the range is before the minimum or the start of the range is
                // after the maximum, don't display this range option at all.
                if ((this.minDate && end.isBefore(this.minDate, this.timePicker ? 'minute' : 'day'))
                    || (maxDate && start.isAfter(maxDate, this.timePicker ? 'minute' : 'day'))) {
                        continue;
                    }

                // Support unicode chars in the range names.
                const elem = document.createElement('textarea');
                elem.innerHTML = range;
                const rangeHtml = elem.value;

                this.ranges[rangeHtml] = [start, end];
            }

            let list = '<ul>';
            for (let i = 0; i < this.ranges; i++) {
                const range = this.ranges[i];
                list += '<li data-range-key="' + range + '">' + range + '</li>';
            }
            if (this.showCustomRangeLabel) {
                list += '<li class="btn btn-sm" data-range-key="' +
                this.locale.customRangeLabel + '">' +
                this.locale.customRangeLabel + '</li>';
            }
            list += '</ul>';
            this.container.find('.ranges').prepend(list);
        }
    }

    private _processSingleDatePicker() {
        if (this.singleDatePicker) {
            this.container.addClass('single');
            this.container.find('.calendar.left').addClass('single');
            this.container.find('.calendar.left').show();
            this.container.find('.calendar.right').hide();
            this.container.find('.daterangepicker_input input, .daterangepicker_input > i').hide();
            if (this.timePicker) {
                this.container.find('.ranges ul').hide();
            } else {
                this.container.find('.ranges').hide();
            }
        }
    }

    private _processTimePicker() {
        if (!this.timePicker) {
            this.startDate = this.startDate.startOf('day');
            this.endDate = this.endDate.endOf('day');
            this.container.find('.calendar-time').hide();
        }

        // can't be used together for now
        if (this.timePicker && this.autoApply) {
            this.autoApply = false;
        }
    }

    private _processCssForLabelsAndButtons() {
        // apply CSS classes and labels to buttons
        this.container.find('.applyBtn, .cancelBtn').addClass(this.buttonClasses);
        if (this.applyClass.length) {
            this.container.find('.applyBtn').addClass(this.applyClass);
        }

        if (this.cancelClass.length) {
            this.container.find('.cancelBtn').addClass(this.cancelClass);
        }

        this.container.find('.applyBtn').html(this.locale.applyLabel);
        this.container.find('.cancelBtn').html(this.locale.cancelLabel);
    }

    private _processEventListeners() {
        //
       // event listeners
       //

       this.container.find('.calendar')
           .on('click.daterangepicker', '.prev', $.proxy(this.clickPrev, this))
           .on('click.daterangepicker', '.next', $.proxy(this.clickNext, this))
           .on('mousedown.daterangepicker', 'td.available', $.proxy(this.clickDate, this))
           .on('mouseenter.daterangepicker', 'td.available', $.proxy(this.hoverDate, this))
           .on('mouseleave.daterangepicker', 'td.available', $.proxy(this.updateFormInputs, this))
           .on('change.daterangepicker', 'select.yearselect', $.proxy(this.monthOrYearChanged, this))
           .on('change.daterangepicker', 'select.monthselect', $.proxy(this.monthOrYearChanged, this))
           .on('change.daterangepicker', 'select.hourselect,select.minuteselect,select.secondselect,select.ampmselect',
                $.proxy(this.timeChanged, this))
           .on('click.daterangepicker', '.daterangepicker_input input', $.proxy(this.showCalendars, this))
           .on('focus.daterangepicker', '.daterangepicker_input input', $.proxy(this.formInputsFocused, this))
           .on('blur.daterangepicker', '.daterangepicker_input input', $.proxy(this.formInputsBlurred, this))
           .on('change.daterangepicker', '.daterangepicker_input input', $.proxy(this.formInputsChanged, this));

       this.container.find('.ranges')
           .on('click.daterangepicker', 'button.applyBtn', $.proxy(this.clickApply, this))
           .on('click.daterangepicker', 'button.cancelBtn', $.proxy(this.clickCancel, this))
           .on('click.daterangepicker', 'li', $.proxy(this.clickRange, this))
           .on('mouseenter.daterangepicker', 'li', $.proxy(this.hoverRange, this))
           .on('mouseleave.daterangepicker', 'li', $.proxy(this.updateFormInputs, this));

       if (this.element.is('input') || this.element.is('button')) {
           this.element.on({
               'click.daterangepicker': $.proxy(this.show, this),
               'focus.daterangepicker': $.proxy(this.show, this),
               'keydown.daterangepicker': $.proxy(this.keydown, this),
               'keyup.daterangepicker': $.proxy(this.elementChanged, this),
           });
       } else {
           this.element.on('click.daterangepicker', $.proxy(this.toggle, this));
       }
    }

    private _processInitialValue() {
        //
        // if attached to a text input, set the initial value
        //

        if (this.element.is('input') && !this.singleDatePicker && this.autoUpdateInput) {
            this.element.val(this.startDate.format(this.locale.format) +
                this.locale.separator +
                this.endDate.format(this.locale.format));

            this.element.trigger('change');
        } else if (this.element.is('input') && this.autoUpdateInput) {
            this.element.val(this.startDate.format(this.locale.format));
            this.element.trigger('change');
        }
    }

    private setStartDate(startDate: moment.Moment | string) {
        if (typeof startDate === 'string') {
            this.startDate = moment(startDate, this.locale.format);
        }

        if (typeof startDate === 'object') {
            this.startDate = moment(startDate);
        }

        if (!this.timePicker) {
            this.startDate = this.startDate.startOf('day');
        }

        if (this.timePicker && this.timePickerIncrement) {
            this.startDate.minute(Math.round(this.startDate.minute() /
                this.timePickerIncrement) * this.timePickerIncrement);
        }

        if (this.minDate && this.startDate.isBefore(this.minDate)) {
            this.startDate = this.minDate;
            if (this.timePicker && this.timePickerIncrement) {
                this.startDate.minute(Math.round(this.startDate.minute() /
                    this.timePickerIncrement) * this.timePickerIncrement);
            }
        }

        if (this.maxDate && this.startDate.isAfter(this.maxDate)) {
            this.startDate = this.maxDate;
            if (this.timePicker && this.timePickerIncrement) {
                this.startDate.minute(Math.floor(this.startDate.minute() /
                    this.timePickerIncrement) * this.timePickerIncrement);
            }
        }

        if (!this.isShowing) {
            this.updateElement();
        }

        this.updateMonthsInView();
    }

    private setEndDate(endDate: moment.Moment | string) {
        if (typeof endDate === 'string') {
            this.endDate = moment(endDate, this.locale.format);
        }

        if (typeof endDate === 'object') {
            this.endDate = moment(endDate);
        }

        if (!this.timePicker) {
            this.endDate = this.endDate.endOf('day');
        }

        if (this.timePicker && this.timePickerIncrement) {
            this.endDate.minute(Math.round(this.endDate.minute() /
                this.timePickerIncrement) * this.timePickerIncrement);
        }

        if (this.endDate.isBefore(this.startDate)) {
            this.endDate = this.startDate.clone();
        }

        if (this.maxDate && this.endDate.isAfter(this.maxDate)) {
            this.endDate = this.maxDate;
        }

        if (this.dateLimit && this.startDate.clone().add(this.dateLimit).isBefore(this.endDate)) {
            this.endDate = this.startDate.clone().add(this.dateLimit);
        }

        this.previousRightTime = this.endDate.clone();

        if (!this.isShowing) {
            this.updateElement();
        }

        this.updateMonthsInView();
    }

    private isInvalidDate(options?: any) {
        return false;
    }

    private isCustomDate(options?: any) {
       return false;
    }

    private updateView() {
        if (this.timePicker) {
            this.renderTimePicker('left');
            this.renderTimePicker('right');
            if (!this.endDate) {
                this.container.find('.right .calendar-time select').attr('disabled', 'disabled').addClass('disabled');
            } else {
                this.container.find('.right .calendar-time select').removeAttr('disabled').removeClass('disabled');
            }
        }
        if (this.endDate) {
            this.container.find('input[name="daterangepicker_end"]').removeClass('active');
            this.container.find('input[name="daterangepicker_start"]').addClass('active');
        } else {
            this.container.find('input[name="daterangepicker_end"]').addClass('active');
            this.container.find('input[name="daterangepicker_start"]').removeClass('active');
        }
        this.updateMonthsInView();
        this.updateCalendars();
        this.updateFormInputs();
    }

    private updateMonthsInView() {
        if (this.endDate) {

            // if both dates are visible already, do nothing
            if (!this.singleDatePicker && this.leftCalendar.month && this.rightCalendar.month &&
                (this.startDate.format('YYYY-MM') === this.leftCalendar.month.format('YYYY-MM') ||
                this.startDate.format('YYYY-MM') === this.rightCalendar.month.format('YYYY-MM'))
                &&
                (this.endDate.format('YYYY-MM') === this.leftCalendar.month.format('YYYY-MM') ||
                this.endDate.format('YYYY-MM') === this.rightCalendar.month.format('YYYY-MM'))
                ) {
                return;
            }

            this.leftCalendar.month = this.startDate.clone().date(2);
            if (!this.linkedCalendars && (this.endDate.month() !== this.startDate.month() ||
                this.endDate.year() !== this.startDate.year())) {
                this.rightCalendar.month = this.endDate.clone().date(2);
            } else {
                this.rightCalendar.month = this.startDate.clone().date(2).add(1, 'month');
            }

        } else {
            if (this.leftCalendar.month.format('YYYY-MM') !== this.startDate.format('YYYY-MM') &&
                this.rightCalendar.month.format('YYYY-MM') !== this.startDate.format('YYYY-MM')) {
                this.leftCalendar.month = this.startDate.clone().date(2);
                this.rightCalendar.month = this.startDate.clone().date(2).add(1, 'month');
            }
        }
        if (this.maxDate && this.linkedCalendars && !this.singleDatePicker && this.rightCalendar.month > this.maxDate) {
          this.rightCalendar.month = this.maxDate.clone().date(2);
          this.leftCalendar.month = this.maxDate.clone().date(2).subtract(1, 'month');
        }
    }

    private updateCalendars() {

        if (this.timePicker) {
            let hour: number;
            let minute: number;
            let second: number;

            if (this.endDate) {
                hour = parseInt(this.container.find('.left .hourselect').val(), 10);
                minute = parseInt(this.container.find('.left .minuteselect').val(), 10);
                second = this.timePickerSeconds ? parseInt(this.container.find('.left .secondselect').val(), 10) : 0;
                if (!this.timePicker24Hour) {
                    const ampm = this.container.find('.left .ampmselect').val();

                    if (ampm === 'PM' && hour < 12) {
                        hour += 12;
                    }
                    if (ampm === 'AM' && hour === 12) {
                        hour = 0;
                    }
                }
            } else {
                hour = parseInt(this.container.find('.right .hourselect').val(), 10);
                minute = parseInt(this.container.find('.right .minuteselect').val(), 10);
                second = this.timePickerSeconds ? parseInt(this.container.find('.right .secondselect').val(), 10) : 0;
                if (!this.timePicker24Hour) {
                    const ampm = this.container.find('.right .ampmselect').val();
                    if (ampm === 'PM' && hour < 12) {
                        hour += 12;
                    }
                    if (ampm === 'AM' && hour === 12) {
                        hour = 0;
                    }
                }
            }
            this.leftCalendar.month.hour(hour).minute(minute).second(second);
            this.rightCalendar.month.hour(hour).minute(minute).second(second);
        }

        this.renderCalendar('left');
        this.renderCalendar('right');

        // highlight any predefined range matching the current start and end dates
        this.container.find('.ranges li').removeClass('active');
        if (this.endDate == null) { return; }

        this.calculateChosenLabel();
    }

    private renderCalendar(side: string) {

        //
        // Build the matrix of dates that will populate the calendar
        //

        const calendar = side === 'left' ? this.leftCalendar : this.rightCalendar;
        const month = calendar.month.month();
        const year = calendar.month.year();
        const hour = calendar.month.hour();
        const minute = calendar.month.minute();
        const second = calendar.month.second();
        const daysInMonth = moment([year, month]).daysInMonth();
        const firstDay = moment([year, month, 1]);
        const lastDay = moment([year, month, daysInMonth]);
        const lastMonth = moment(firstDay).subtract(1, 'month').month();
        const lastYear = moment(firstDay).subtract(1, 'month').year();
        const daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();
        const dayOfWeek = firstDay.day();

        // initialize a 6 rows x 7 columns array for the calendar
        // let calendar: any = [];
        calendar.firstDay = firstDay;
        calendar.lastDay = lastDay;

        for (let i = 0; i < 6; i++) {
            calendar[i] = [];
        }

        // populate the calendar with date objects
        let startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
        if (startDay > daysInLastMonth) {
            startDay -= 7;
        }

        if (dayOfWeek === this.locale.firstDay) {
            startDay = daysInLastMonth - 6;
        }

        let curDate = moment([lastYear, lastMonth, startDay, 12, minute, second]);

        for (let i = 0, col = 0, row = 0; i < 42; i++, col++, curDate = moment(curDate).add(24, 'hour')) {
            if (i > 0 && col % 7 === 0) {
                col = 0;
                row++;
            }
            calendar[row][col] = curDate.clone().hour(hour).minute(minute).second(second);
            curDate.hour(12);

            if (this.minDate && calendar[row][col].format('YYYY-MM-DD') === this.minDate.format('YYYY-MM-DD')
                && calendar[row][col].isBefore(this.minDate) && side === 'left') {
                calendar[row][col] = this.minDate.clone();
            }

            if (this.maxDate && calendar[row][col].format('YYYY-MM-DD') === this.maxDate.format('YYYY-MM-DD')
                && calendar[row][col].isAfter(this.maxDate) && side === 'right') {
                calendar[row][col] = this.maxDate.clone();
            }

        }

        // make the calendar object available to hoverDate/clickDate
        if (side === 'left') {
            this.leftCalendar.calendar = calendar;
        } else {
            this.rightCalendar.calendar = calendar;
        }

        //
        // Display the calendar
        //

        const minDate = side === 'left' ? this.minDate : this.startDate;
        let maxDate = this.maxDate;
        // let selected: moment.Moment = side === 'left' ? this.startDate : this.endDate;
        const arrow = this.locale.direction === 'ltr'
            ? {left: 'chevron-left', right: 'chevron-right'} : {left: 'chevron-right', right: 'chevron-left'};

        let html = '<table class="table-condensed">';
        html += '<thead>';
        html += '<tr>';

        // add empty cell for week number
        if (this.showWeekNumbers || this.showISOWeekNumbers) {
            html += '<th></th>';
        }

        if ((!minDate || minDate.isBefore(calendar.firstDay)) && (!this.linkedCalendars || side === 'left')) {
            html += '<th class="prev available"><i class="zmdi zmdi-' + arrow.left + '"></i></th>';
        } else {
            html += '<th></th>';
        }

        let dateHtml = this.locale.monthNames[calendar[1][1].month()] + calendar[1][1].format('YYYY');

        if (this.showDropdowns) {
            const currentMonth = calendar[1][1].month();
            const currentYear = calendar[1][1].year();
            const maxYear = (maxDate && maxDate.year()) || (currentYear + 5);
            const minYear = (minDate && minDate.year()) || (currentYear - 50);
            const inMinYear = currentYear === minYear;
            const inMaxYear = currentYear === maxYear;

            let monthHtml = '<select class="monthselect">';
            for (let m = 0; m < 12; m++) {
                if ((!inMinYear || m >= minDate.month()) && (!inMaxYear || m <= maxDate.month())) {
                    monthHtml += '<option value="' + m + '"' +
                        (m === currentMonth ? ' selected="selected"' : '') +
                        '>' + this.locale.monthNames[m] + '</option>';
                } else {
                    monthHtml += '<option value="' + m + '"' +
                        (m === currentMonth ? ' selected="selected"' : '') +
                        ' disabled="disabled">' + this.locale.monthNames[m] + '</option>';
                }
            }
            monthHtml += '</select>';

            let yearHtml = '<select class="yearselect">';
            for (let y = minYear; y <= maxYear; y++) {
                yearHtml += '<option value="' + y + '"' +
                    (y === currentYear ? ' selected="selected"' : '') +
                    '>' + y + '</option>';
            }
            yearHtml += '</select>';

            dateHtml = monthHtml + yearHtml;
        }

        html += '<th colspan="5" class="month">' + dateHtml + '</th>';
        if ((!maxDate || maxDate.isAfter(calendar.lastDay)) && (!this.linkedCalendars
            || side === 'right' || this.singleDatePicker)) {
            html += '<th class="next available"><i class="zmdi zmdi-' + arrow.right + '"></i></th>';
        } else {
            html += '<th></th>';
        }

        html += '</tr>';
        html += '<tr>';

        // add week number label
        if (this.showWeekNumbers || this.showISOWeekNumbers) {
            html += '<th class="week">' + this.locale.weekLabel + '</th>';
        }

        $.each(this.locale.daysOfWeek, (index, dayOfWeek1) => {
            html += '<th>' + dayOfWeek1 + '</th>';
        });

        html += '</tr>';
        html += '</thead>';
        html += '<tbody>';

        // adjust maxDate to reflect the dateLimit setting in order to
        // grey out end dates beyond the dateLimit
        if (this.endDate == null && this.dateLimit) {
            const maxLimit = this.startDate.clone().add(this.dateLimit).endOf('day');
            if (!maxDate || maxLimit.isBefore(maxDate)) {
                maxDate = maxLimit;
            }
        }

        for (let row = 0; row < 6; row++) {
            html += '<tr>';

            // add week number
            if (this.showWeekNumbers) {
                html += '<td class="week">' + calendar[row][0].week() + '</td>';
            } else if (this.showISOWeekNumbers) {
                html += '<td class="week">' + calendar[row][0].isoWeek() + '</td>';
            }

            for (let col = 0; col < 7; col++) {

                const classes: string[] = new Array<string>();

                // highlight today's date
                if (calendar[row][col].isSame(new Date(), 'day')) {
                    classes.push('today');
                }

                // highlight weekends
                if (calendar[row][col].isoWeekday() > 5) {
                    classes.push('weekend');
                }

                // grey out the dates in other months displayed at beginning and end of this calendar
                if (calendar[row][col].month() !== calendar[1][1].month()) {
                    classes.push('off');

                }

                // don't allow selection of dates before the minimum date
                if (this.minDate && calendar[row][col].isBefore(this.minDate, 'day')) {
                    classes.push('off', 'disabled');
                }

                // don't allow selection of dates after the maximum date
                if (maxDate && calendar[row][col].isAfter(maxDate, 'day')) {
                    classes.push('off', 'disabled');
                }

                // don't allow selection of date if a custom function decides it's invalid
                if (this.isInvalidDate(calendar[row][col])) {
                    classes.push('off', 'disabled');
                }

                // highlight the currently selected start date
                if (calendar[row][col].format('YYYY-MM-DD') === this.startDate.format('YYYY-MM-DD')) {
                    classes.push('active', 'start-date');
                }

                // highlight the currently selected end date
                if (this.endDate != null
                    && calendar[row][col].format('YYYY-MM-DD') === this.endDate.format('YYYY-MM-DD')) {
                    classes.push('active', 'end-date');

                }

                // highlight dates in-between the selected dates
                if (this.endDate != null && calendar[row][col] > this.startDate
                    && calendar[row][col] < this.endDate) {
                    classes.push('in-range');
                }

                // apply custom classes for this date
                const isCustom = this.isCustomDate(calendar[row][col]);
                if (isCustom !== false) {
                    if (typeof isCustom === 'string') {
                        classes.push((isCustom as any).toString());
                    } else {
                        Array.prototype.push.apply(classes, isCustom);
                    }
                }

                let cname = '';
                let disabled = false;

                for (let i = 0; i < classes.length; i++) {
                    cname += classes[i] + ' ';
                    if (classes[i] === 'disabled')
                        disabled = true;
                }
                if (!disabled)
                    cname += 'available';

                html += '<td class="' + cname.replace(/^\s+|\s+$/g, '') + '" data-title="' + 'r' + row + 'c' + col + '">' + calendar[row][col].date() + '</td>';

            }
            html += '</tr>';
        }

        html += '</tbody>';
        html += '</table>';

        this.container.find('.calendar.' + side + ' .calendar-table').html(html);

    }

    
    private renderTimePicker(side: string) {

        // Don't bother updating the time picker if it's currently disabled
        // because an end date hasn't been clicked yet
        if (side === 'right' && !this.endDate) { return; }

        let html: string;
        let selected: moment.Moment = moment();
        let minDate: moment.Moment = moment();
        let maxDate = this.maxDate;

        if (this.dateLimit && (!this.maxDate 
            || this.startDate.clone().add(this.dateLimit).isAfter(this.maxDate))) {
            maxDate = this.startDate.clone().add(this.dateLimit);
            }

        if (side === 'left') {
            selected = this.startDate.clone();
            minDate = this.minDate;
        } else if (side === 'right') {
            selected = this.endDate.clone();
            minDate = this.startDate;

            //Preserve the time already selected
            let timeSelector = this.container.find('.calendar.right .calendar-time div');
            if (!this.endDate && timeSelector.html() !== '') {

                selected.hour(timeSelector.find('.hourselect option:selected').val() || selected.hour());
                selected.minute(timeSelector.find('.minuteselect option:selected').val() || selected.minute());
                selected.second(timeSelector.find('.secondselect option:selected').val() || selected.second());

                if (!this.timePicker24Hour) {
                    let ampm = timeSelector.find('.ampmselect option:selected').val();
                    if (ampm === 'PM' && selected.hour() < 12)
                        selected.hour(selected.hour() + 12);
                    if (ampm === 'AM' && selected.hour() === 12)
                        selected.hour(0);
                }

            }

            if (selected.isBefore(this.startDate))
                selected = this.startDate.clone();

            if (maxDate && selected.isAfter(maxDate))
                selected = maxDate.clone();

        }

        //
        // hours
        //

        
        html = '<select class="hourselect">';

        let start = this.timePicker24Hour ? 0 : 1;
        let end = this.timePicker24Hour ? 23 : 12;

        for (let i = start; i <= end; i++) {
            let i_in_24 = i;
            if (!this.timePicker24Hour)
                i_in_24 = selected.hour() >= 12 ? (i === 12 ? 12 : i + 12) : (i === 12 ? 0 : i);

            let time = selected.clone().hour(i_in_24);
            let disabled = false;
            if (minDate && time.minute(59).isBefore(minDate))
                disabled = true;
            if (maxDate && time.minute(0).isAfter(maxDate))
                disabled = true;

            if (i_in_24 === selected.hour() && !disabled) {
                html += '<option value="' + i + '" selected="selected">' + i + '</option>';
            } else if (disabled) {
                html += '<option value="' + i + '" disabled="disabled" class="disabled">' + i + '</option>';
            } else {
                html += '<option value="' + i + '">' + i + '</option>';
            }
        }

        html += '</select> ';

        //
        // minutes
        //

        html += ': <select class="minuteselect">';

        for (let i = 0; i < 60; i += this.timePickerIncrement) {
            let padded = i < 10 ? '0' + i : i;
            let time = selected.clone().minute(i);

            let disabled = false;
            if (minDate && time.second(59).isBefore(minDate))
                disabled = true;
            if (maxDate && time.second(0).isAfter(maxDate))
                disabled = true;

            if (selected.minute() === i && !disabled) {
                html += '<option value="' + i + '" selected="selected">' + padded + '</option>';
            } else if (disabled) {
                html += '<option value="' + i + '" disabled="disabled" class="disabled">' + padded + '</option>';
            } else {
                html += '<option value="' + i + '">' + padded + '</option>';
            }
        }

        html += '</select> ';

        //
        // seconds
        //

        if (this.timePickerSeconds) {
            html += ': <select class="secondselect">';

            for (let i = 0; i < 60; i++) {
                let padded = i < 10 ? '0' + i : i;
                let time = selected.clone().second(i);

                let disabled = false;
                if (minDate && time.isBefore(minDate))
                    disabled = true;
                if (maxDate && time.isAfter(maxDate))
                    disabled = true;

                if (selected.second() === i && !disabled) {
                    html += '<option value="' + i + '" selected="selected">' + padded + '</option>';
                } else if (disabled) {
                    html += '<option value="' + i + '" disabled="disabled" class="disabled">' + padded + '</option>';
                } else {
                    html += '<option value="' + i + '">' + padded + '</option>';
                }
            }

            html += '</select> ';
        }

        //
        // AM/PM
        //

        if (!this.timePicker24Hour) {
            html += '<select class="ampmselect">';

            let am_html = '';
            let pm_html = '';

            if (minDate && selected.clone().hour(12).minute(0).second(0).isBefore(minDate))
                am_html = ' disabled="disabled" class="disabled"';

            if (maxDate && selected.clone().hour(0).minute(0).second(0).isAfter(maxDate))
                pm_html = ' disabled="disabled" class="disabled"';

            if (selected.hour() >= 12) {
                html += '<option value="AM"' + am_html + '>AM</option><option value="PM" selected="selected"' + pm_html + '>PM</option>';
            } else {
                html += '<option value="AM" selected="selected"' + am_html + '>AM</option><option value="PM"' + pm_html + '>PM</option>';
            }

            html += '</select>';
        }

        this.container.find('.calendar.' + side + ' .calendar-time div').html(html);

    }

    private updateFormInputs() {

       //ignore mouse movements while an above-calendar text input has focus
       if (this.container.find('input[name=daterangepicker_start]').is(':focus') || this.container.find('input[name=daterangepicker_end]').is(':focus'))
           return;

       this.container.find('input[name=daterangepicker_start]').val(this.startDate.format(this.locale.format));
       if (this.endDate)
           this.container.find('input[name=daterangepicker_end]').val(this.endDate.format(this.locale.format));

       if (this.singleDatePicker || (this.endDate && (this.startDate.isBefore(this.endDate) || this.startDate.isSame(this.endDate)))) {
           this.container.find('button.applyBtn').removeAttr('disabled');
       } else {
           this.container.find('button.applyBtn').attr('disabled', 'disabled');
       }
    }

    private move() {
        let parentOffset = { top: 0, left: 0 },
            containerTop: number;
        let parentRightEdge = $(window).width();
        if (!this.parentEl.is('body')) {
            parentOffset = {
                top: this.parentEl.offset().top - this.parentEl.scrollTop(),
                left: this.parentEl.offset().left - this.parentEl.scrollLeft(),
            };
            parentRightEdge = this.parentEl[0].clientWidth + this.parentEl.offset().left;
        }

        if (this.drops === 'up') {
            containerTop = this.element.offset().top - this.container.outerHeight() - parentOffset.top;
        } else {
            containerTop = this.element.offset().top + this.element.outerHeight() - parentOffset.top;
        }

        (<any>this.container[this.drops === 'up' ? 'addClass' : 'removeClass'])('dropup');

        if (this.opens === 'left') {
            this.container.css({
                top: containerTop,
                right: parentRightEdge - this.element.offset().left - this.element.outerWidth(),
                left: 'auto',
            });
            if (this.container.offset().left < 0) {
                this.container.css({
                    right: 'auto',
                    left: 9,
                });
            }
        } else if (this.opens === 'center') {
            this.container.css({
                top: containerTop,
                left: this.element.offset().left - parentOffset.left + this.element.outerWidth() / 2
                        - this.container.outerWidth() / 2,
                right: 'auto',
            });
            if (this.container.offset().left < 0) {
                this.container.css({
                    right: 'auto',
                    left: 9,
                });
            }
        } else {
            this.container.css({
                top: containerTop,
                left: this.element.offset().left - parentOffset.left,
                right: 'auto',
            });
            if (this.container.offset().left + this.container.outerWidth() > $(window).width()) {
                this.container.css({
                    left: 'auto',
                    right: 0,
                });
            }
        }
    }

    private show(e?: MouseEvent) {
        if (this.isShowing) return;

        // Create a click proxy that is private to this instance of datepicker, for unbinding
        this._outsideClickProxy = $.proxy(function(this: DateRangePickerComponent, e) { this.outsideClick(e); }, this);

        // Bind global datepicker mousedown for hiding and
        $(document)
          .on('mousedown.daterangepicker', this._outsideClickProxy)
          // also support mobile devices
          .on('touchend.daterangepicker', this._outsideClickProxy)
          // also explicitly play nice with Bootstrap dropdowns, which stopPropagation when clicking them
          .on('click.daterangepicker', '[data-toggle=dropdown]', this._outsideClickProxy)
          // and also close when focus changes to outside the picker (eg. tabbing between controls)
          .on('focusin.daterangepicker', this._outsideClickProxy);

        // Reposition the picker if the window is resized while it's open
        $(window).on('resize.daterangepicker', $.proxy(function(this: DateRangePickerComponent, e) { this.move(); }, this));

        this.oldStartDate = this.startDate.clone();
        this.oldEndDate = this.endDate.clone();
        this.previousRightTime = this.endDate.clone();

        this.updateView();
        this.container.show();
        this.move();
        this.element.trigger('show.daterangepicker', this);
        this.isShowing = true;
    }

    private hide(e?: MouseEvent) {
       if (!this.isShowing) return;

       //incomplete date selection, revert to last values
       if (!this.endDate) {
           this.startDate = this.oldStartDate.clone();
           this.endDate = this.oldEndDate.clone();
       }

       //if a new date range was selected, invoke the user callback function
       if (!this.startDate.isSame(this.oldStartDate) || !this.endDate.isSame(this.oldEndDate))
           this.callback(this.startDate, this.endDate, this.chosenLabel);

       //if picker is attached to a text input, update it
       this.updateElement();

       $(document).off('.daterangepicker');
       $(window).off('.daterangepicker');
       this.container.hide();
       this.element.trigger('hide.daterangepicker', this);
       this.isShowing = false;
    }

    private toggle(e: MouseEvent) {
       if (this.isShowing) {
           this.hide();
       } else {
           this.show();
       }
    }

    /* tslint:disable */
    private outsideClick(e: MouseEvent) {
       let target = $(e.target);
       // if the page is clicked anywhere except within the daterangerpicker/button
       // itself then call this.hide()
       if (
           // ie modal dialog fix
           e.type === 'focusin' ||
           target.closest(this.element).length ||
           target.closest(this.container).length ||
           target.closest('.calendar-table').length
           ) return;
       this.hide();
       this.element.trigger('outsideClick.daterangepicker', this);
    }
    /* tslint:enable */

    private showCalendars() {
       this.container.addClass('show-calendar');
       this.move();
       this.element.trigger('showCalendar.daterangepicker', this);
   }

    private hideCalendars() {
        this.container.removeClass('show-calendar');
        this.element.trigger('hideCalendar.daterangepicker', this);
    }

    private hoverRange(e: JQueryMouseEventObject) {
         // ignore mouse movements while an above-calendar text input has focus
         if (this.container.find('input[name=daterangepicker_start]').is(':focus') ||
            this.container.find('input[name=daterangepicker_end]').is(':focus')) {
             return;
            }

         const label = e.target.getAttribute('data-range-key') || '';

         if (label === this.locale.customRangeLabel) {
             this.updateView();
         } else {
             const dates = this.ranges[label];
             this.container.find('input[name=daterangepicker_start]').val(dates[0].format(this.locale.format));
             this.container.find('input[name=daterangepicker_end]').val(dates[1].format(this.locale.format));
         }
     }

     private clickRange(e: JQueryMouseEventObject) {
        const label = e.target.getAttribute('data-range-key') || '';
        this.chosenLabel = label;
        if (label === this.locale.customRangeLabel) {
            this.showCalendars();
        } else {
            const dates = this.ranges[label];
            this.startDate = dates[0];
            this.endDate = dates[1];

            if (!this.timePicker) {
                this.startDate.startOf('day');
                this.endDate.endOf('day');
            }

            if (!this.alwaysShowCalendars) {
                this.hideCalendars();
            }
            this.clickApply();
        }
    }

    private clickPrev(e: JQueryMouseEventObject) {
        const cal = $(e.target).parents('.calendar');
        if (cal.hasClass('left')) {
            this.leftCalendar.month.subtract(1, 'month');
            if (this.linkedCalendars) {
                this.rightCalendar.month.subtract(1, 'month');
            }
        } else {
            this.rightCalendar.month.subtract(1, 'month');
        }
        this.updateCalendars();
    }

    private clickNext(e: JQueryMouseEventObject) {
        const cal = $(e.target).parents('.calendar');
        if (cal.hasClass('left')) {
            this.leftCalendar.month.add(1, 'month');
        } else {
            this.rightCalendar.month.add(1, 'month');
            if (this.linkedCalendars) {
                this.leftCalendar.month.add(1, 'month');
            }
        }
        this.updateCalendars();
    }

    private hoverDate(e: JQueryMouseEventObject) {

        // ignore mouse movements while an above-calendar text input has focus
        // if (this.container.find('input[name=daterangepicker_start]').is(":focus")
        // || this.container.find('input[name=daterangepicker_end]').is(":focus"))
        //    return;

        // ignore dates that can't be selected
        if (!$(e.target).hasClass('available')) { return; }

        // have the text inputs above calendars reflect the date being hovered over
        let title = $(e.target).attr('data-title');
        let row = title.substr(1, 1);
        let col = title.substr(3, 1);
        let cal = $(e.target).parents('.calendar');
        let date = cal.hasClass('left')
            ? this.leftCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col];

        if (this.endDate && !this.container.find('input[name=daterangepicker_start]').is(':focus')) {
            this.container.find('input[name=daterangepicker_start]').val(date.format(this.locale.format));
        } else if (!this.endDate && !this.container.find('input[name=daterangepicker_end]').is(':focus')) {
            this.container.find('input[name=daterangepicker_end]').val(date.format(this.locale.format));
        }

        // highlight the dates between the start date and the date being hovered as a potential end date
        const leftCalendar = this.leftCalendar;
        const rightCalendar = this.rightCalendar;
        const startDate = this.startDate;
        if (!this.endDate) {
            this.container.find('.calendar td').each((index, el) => {

                // skip week numbers, only look at dates
                if ($(el).hasClass('week')) { return; }

                title = $(el).attr('data-title');
                row = title.substr(1, 1);
                col = title.substr(3, 1);
                cal = $(el).parents('.calendar');
                date = cal.hasClass('left') ? leftCalendar.calendar[row][col] : rightCalendar.calendar[row][col];

                if ((date.isAfter(startDate) && date.isBefore(date)) || date.isSame(date, 'day')) {
                    $(el).addClass('in-range');
                } else {
                    $(el).removeClass('in-range');
                }
            });
        }
    }

    private clickDate(e: JQueryMouseEventObject) {

        if (!$(e.target).hasClass('available')) { return; }

        const title = $(e.target).attr('data-title');
        const row = title.substr(1, 1);
        const col = title.substr(3, 1);
        const cal = $(e.target).parents('.calendar');
        let date = cal.hasClass('left')
            ? this.leftCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col];

        //
        // this function needs to do a few things:
        // * alternate between selecting a start and end date for the range,
        // * if the time picker is enabled, apply the hour/minute/second from the select boxes to the clicked date
        // * if autoapply is enabled, and an end date was chosen, apply the selection
        // * if single date picker mode, and time picker isn't enabled, apply the selection immediately
        // * if one of the inputs above the calendars was focused, cancel that manual input
        //

        if (this.endDate || date.isBefore(this.startDate, 'day')) { // picking start
            if (this.timePicker) {
                let hour = parseInt(this.container.find('.left .hourselect').val(), 10);
                if (!this.timePicker24Hour) {
                    const ampm = this.container.find('.left .ampmselect').val();
                    if (ampm === 'PM' && hour < 12) {
                        hour += 12;
                    }
                    if (ampm === 'AM' && hour === 12) {
                        hour = 0;
                    }
                }

                const minute = parseInt(this.container.find('.left .minuteselect').val(), 10);
                const second = this.timePickerSeconds
                    ? parseInt(this.container.find('.left .secondselect').val(), 10) : 0;
                date = date.clone().hour(hour).minute(minute).second(second);
            }
            this.endDate = null;
            this.setStartDate(date.clone());
        } else if (!this.endDate && date.isBefore(this.startDate)) {
            // special case: clicking the same date for start/end,
            // but the time of the end date is before the start date
            this.setEndDate(this.startDate.clone());
        } else { // picking end
            if (this.timePicker) {
                let hour = parseInt(this.container.find('.right .hourselect').val(), 10);
                if (!this.timePicker24Hour) {
                    const ampm = this.container.find('.right .ampmselect').val();
                    if (ampm === 'PM' && hour < 12) {
                        hour += 12;
                    }
                    if (ampm === 'AM' && hour === 12) {
                        hour = 0;
                    }
                }
                const minute = parseInt(this.container.find('.right .minuteselect').val(), 10);
                const second = this.timePickerSeconds
                    ? parseInt(this.container.find('.right .secondselect').val(), 10) : 0;
                date = date.clone().hour(hour).minute(minute).second(second);
            }
            this.setEndDate(date.clone());
            if (this.autoApply) {
              this.calculateChosenLabel();
              this.clickApply();
            }
        }

        if (this.singleDatePicker) {
            this.setEndDate(this.startDate);
            if (!this.timePicker) {
                this.clickApply();
            }
        }

        this.updateView();

        // This is to cancel the blur event handler if the mouse was in one of the inputs
        e.stopPropagation();

    }

    private calculateChosenLabel() {
      let customRange = true;
    //   let i = 0;
      for (let i = 0; i < this.ranges.length; i++) {
          const range = this.ranges[i];

          if (this.timePicker) {
              if (this.startDate.isSame(this.ranges[range][0]) && this.endDate.isSame(this.ranges[range][1])) {
                  customRange = false;
                  this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').html();
                  break;
              }
          } else {
              // ignore times when comparing dates if time picker is not enabled
              if (this.startDate.format('YYYY-MM-DD') === this.ranges[range][0].format('YYYY-MM-DD')
                && this.endDate.format('YYYY-MM-DD') === this.ranges[range][1].format('YYYY-MM-DD')) {
                  customRange = false;
                  this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').html();
                  break;
              }
          }
          i++;
      }
      if (customRange && this.showCustomRangeLabel) {
          this.chosenLabel = this.container.find('.ranges li:last').addClass('active').html();
          this.showCalendars();
      }
    }

    private clickApply(e?: JQueryMouseEventObject) {
        this.hide();
        this.element.trigger('apply.daterangepicker', this);
        this.updateControlValue();
    }

    private updateControlValue() {
        const startDate = this.startDate.format(this.locale.format);
        const endDate = this.endDate.format(this.locale.format);

        this.control.setValue(`${startDate} - ${endDate}`);
        this.rangeChanged.emit(new DateRange(this.startDate.clone(), this.endDate.clone()));
    }

    private clickCancel(e: JQueryMouseEventObject) {
        this.startDate = this.oldStartDate;
        this.endDate = this.oldEndDate;
        this.hide();
        this.element.trigger('cancel.daterangepicker', this);
    }

    private monthOrYearChanged(e: JQueryMouseEventObject) {
        const isLeft = $(e.target).closest('.calendar').hasClass('left');
        const leftOrRight = isLeft ? 'left' : 'right';
        const cal = this.container.find('.calendar.' + leftOrRight);

        // Month must be Number for new moment versions
        let month = parseInt(cal.find('.monthselect').val(), 10);
        let year = cal.find('.yearselect').val();

        if (!isLeft) {
            if (year < this.startDate.year() || (year === this.startDate.year() && month < this.startDate.month())) {
                month = this.startDate.month();
                year = this.startDate.year();
            }
        }

        if (this.minDate) {
            if (year < this.minDate.year() || (year === this.minDate.year() && month < this.minDate.month())) {
                month = this.minDate.month();
                year = this.minDate.year();
            }
        }

        if (this.maxDate) {
            if (year > this.maxDate.year() || (year === this.maxDate.year() && month > this.maxDate.month())) {
                month = this.maxDate.month();
                year = this.maxDate.year();
            }
        }

        if (isLeft) {
            this.leftCalendar.month.month(month).year(year);
            if (this.linkedCalendars) {
                this.rightCalendar.month = this.leftCalendar.month.clone().add(1, 'month');
            }
        } else {
            this.rightCalendar.month.month(month).year(year);
            if (this.linkedCalendars) {
                this.leftCalendar.month = this.rightCalendar.month.clone().subtract(1, 'month');
            }
        }
        this.updateCalendars();
    }

    private timeChanged(e: JQueryMouseEventObject) {

        const cal = $(e.target).closest('.calendar');
        const isLeft = cal.hasClass('left');

        let hour = parseInt(cal.find('.hourselect').val(), 10);
        const minute = parseInt(cal.find('.minuteselect').val(), 10);
        const second = this.timePickerSeconds ? parseInt(cal.find('.secondselect').val(), 10) : 0;

        if (!this.timePicker24Hour) {
            const ampm = cal.find('.ampmselect').val();
            if (ampm === 'PM' && hour < 12) {
                hour += 12;
            }
            if (ampm === 'AM' && hour === 12) {
                hour = 0;
            }
        }

        if (isLeft) {
            const start = this.startDate.clone();
            start.hour(hour);
            start.minute(minute);
            start.second(second);
            this.setStartDate(start);
            if (this.singleDatePicker) {
                this.endDate = this.startDate.clone();
            } else if (this.endDate
                && this.endDate.format('YYYY-MM-DD') === start.format('YYYY-MM-DD') && this.endDate.isBefore(start)) {
                this.setEndDate(start.clone());
            }
        } else if (this.endDate) {
            const end = this.endDate.clone();
            end.hour(hour);
            end.minute(minute);
            end.second(second);
            this.setEndDate(end);
        }

        // update the calendars so all clickable dates reflect the new time component
        this.updateCalendars();

        // update the form inputs above the calendars with the new time
        this.updateFormInputs();

        // re-render the time pickers because changing one selection can affect what's enabled in another
        this.renderTimePicker('left');
        this.renderTimePicker('right');

    }

    private formInputsChanged(e: JQueryMouseEventObject) {
        const isRight = $(e.target).closest('.calendar').hasClass('right');
        let start = moment(this.container.find('input[name="daterangepicker_start"]').val(), this.locale.format);
        const end = moment(this.container.find('input[name="daterangepicker_end"]').val(), this.locale.format);

        if (start.isValid() && end.isValid()) {

            if (isRight && end.isBefore(start)) {
                start = end.clone();
            }

            this.setStartDate(start);
            this.setEndDate(end);

            if (isRight) {
                this.container.find('input[name="daterangepicker_start"]')
                    .val(this.startDate.format(this.locale.format));
            } else {
                this.container.find('input[name="daterangepicker_end"]').val(this.endDate.format(this.locale.format));
            }

        }

        this.updateView();
    }

    private formInputsFocused(e: JQueryMouseEventObject) {

        // Highlight the focused input
        this.container.find('input[name="daterangepicker_start"], input[name="daterangepicker_end"]')
            .removeClass('active');
        $(e.target).addClass('active');

        // Set the state such that if the user goes back to using a mouse,
        // the calendars are aware we're selecting the end of the range, not
        // the start. This allows someone to edit the end of a date range without
        // re-selecting the beginning, by clicking on the end date input then
        // using the calendar.
        const isRight = $(e.target).closest('.calendar').hasClass('right');
        if (isRight) {
            this.endDate = null;
            this.setStartDate(this.startDate.clone());
            this.updateView();
        }

    }

    private formInputsBlurred(e: JQueryMouseEventObject) {

        // this function has one purpose right now: if you tab from the first
        // text input to the second in the UI, the endDate is nulled so that
        // you can click another, but if you tab out without clicking anything
        // or changing the input value, the old endDate should be retained

        if (!this.endDate) {
            const val = this.container.find('input[name="daterangepicker_end"]').val();
            const end = moment(val, this.locale.format);
            if (end.isValid()) {
                this.setEndDate(end);
                this.updateView();
            }
        }

    }

    private elementChanged() {
        if (!this.element.is('input')) { return; }
        if (!this.element.val().length) { return; }
        if (this.element.val().length < this.locale.format.length) { return; }

        const dateString = this.element.val().split(this.locale.separator);
        let start: moment.Moment = moment();
        let end: moment.Moment = moment();

        if (dateString.length === 2) {
            start = moment(dateString[0], this.locale.format);
            end = moment(dateString[1], this.locale.format);
        }

        if (this.singleDatePicker || start === null || end === null) {
            start = moment(this.element.val(), this.locale.format);
            end = start;
        }

        if (!start.isValid() || !end.isValid()) { return; }

        this.setStartDate(start);
        this.setEndDate(end);
        this.updateView();
    }

    private keydown(e: JQueryKeyEventObject) {
        // hide on tab or enter
        if ((e.keyCode === 9) || (e.keyCode === 13)) {
            this.hide();
        }
    }

    private updateElement() {
        if (this.element.is('input') && !this.singleDatePicker && this.autoUpdateInput) {
            this.element.val(this.startDate.format(this.locale.format)
                + this.locale.separator + this.endDate.format(this.locale.format));
            this.element.trigger('change');
        } else if (this.element.is('input') && this.autoUpdateInput) {
            this.element.val(this.startDate.format(this.locale.format));
            this.element.trigger('change');
        }
    }

    private remove() {
        this.container.remove();
        this.element.off('.daterangepicker');
        this.element.removeData();
    }

}
