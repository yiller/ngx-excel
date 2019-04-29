import { Component, OnInit, Input, Optional, Inject } from '@angular/core';
import { NgxExcelComponentRef, NgxExcelComponent } from '../ngx-excel.component';
import { NgxExcelAction, NgxExcelActionScope, NgxExcelContextChanged, NgxExcelContextMenuClickedEvent } from '../models';
import { Observable } from 'rxjs';

@Component({
    selector: 'ngx-excel-context-action',
    template: ''
})

export class NgxExcelContextActionComponent<T> implements OnInit {

    protected isPrefixContextAction = false;
    protected actionDisabled: (context: T) => boolean;
    protected actionHidden: (context: T) => boolean;

    @Input() label: string;
    @Input() action: string;
    @Input() icon: string;
    @Input() scope: NgxExcelActionScope = NgxExcelActionScope.Context;
    @Input() execute: (payload: NgxExcelContextMenuClickedEvent<T>) => Observable<NgxExcelContextChanged<T>[]> | void;

    @Input()
    set disabled(value: boolean | ((context: T) => boolean)) {
        if (typeof(value) === 'function') {
            this.actionDisabled = value;
        } else {
            this.actionDisabled = () => value === false ? false : true;
        }
    }

    @Input()
    set hidden(value: boolean | ((context: T) => boolean)) {
        if (typeof(value) === 'function') {
            this.actionHidden = value;
        } else {
            this.actionHidden = () => value === false ? false : true;
        }
    }

    @Input() enabledFn: (context: T) => boolean;
    @Input() visibleFn: (context: T) => boolean;
    @Input()
    set prefix(value: boolean) { this.isPrefixContextAction = value === false ? false : true; }
    get prefix(): boolean { return this.isPrefixContextAction; }

    constructor(
        @Optional() @Inject(NgxExcelComponentRef) protected excelComponentRef: NgxExcelComponent<T>
    ) { }

    ngOnInit() {
        if (!this.excelComponentRef || !this.label || !this.action) { return; }

        const excelAction = {} as NgxExcelAction<T>;
        excelAction.label       = this.label || '';
        excelAction.action      = this.action || '';
        excelAction.icon        = this.icon;
        excelAction.prefix      = this.prefix;
        if (excelAction.prefix) {
            this.scope = NgxExcelActionScope.Excel;
        }
        excelAction.actionScope = this.scope;
        excelAction.execute     = this.execute || null;
        excelAction.enabled     = (payload) => this.actionDisabled ? !this.actionDisabled(payload.context) : true;
        excelAction.visible     = (payload) => {
            if (this.actionHidden) { return !this.actionHidden(payload.context); }
            if (this.scope === NgxExcelActionScope.Column) { return !!payload.context && !!payload.column; }
            if (this.scope === NgxExcelActionScope.Context) { return !!payload.context; }
            return true;
        };

        if (excelAction.label.length === 0 || excelAction.action.length === 0) { return; }
        this.excelComponentRef.addExcelAction(excelAction);
    }
}
