import { Component, OnInit, Input, Inject, TemplateRef, Optional } from '@angular/core';
import { NgxExcelColumnTemplateContext, NgxExcelColumn, NgxExcelColumnType } from '../models';
import { NgxExcelComponent, NgxExcelComponentRef } from '../ngx-excel.component';
import { NgxExcelService } from '../services/ngx-excel.service';

@Component({
    selector: 'ngx-excel-column',
    template: ''
})

export class NgxExcelColumnComponent<T> implements OnInit {

    protected excelColumnLocked = false;
    protected excelColumnReadOnly: boolean | ((context: T) => boolean) = false;
    protected excelColumnInvisible = false;
    protected excelColumnCanSort = false;
    protected excelColumnCanCollapse = false;

    @Input() name: string;
    @Input() label: string;
    @Input() width: number;
    @Input()
    set locked(value: boolean) { this.excelColumnLocked = value === false ? false : true; }
    get locked(): boolean { return this.excelColumnLocked; }
    @Input()
    set readonly(value: boolean | ((context: T) => boolean)) {
        if (typeof(value) === 'function') {
            this.excelColumnReadOnly = value;
        } else {
            this.excelColumnReadOnly = value === false ? false : true;
        }
    }
    get readonly(): boolean | ((context: T) => boolean) {
        return this.excelColumnReadOnly;
    }
    @Input()
    set invisible(value: boolean) { this.excelColumnInvisible = value === false ? false : true; }
    get invisible(): boolean { return this.excelColumnInvisible; }
    @Input()
    set sortable(value: boolean) { this.excelColumnCanSort = value === false ? false : true; }
    get sortable(): boolean { return this.excelColumnCanSort; }

    @Input() template: TemplateRef<NgxExcelColumnTemplateContext<T>>;
    @Input() templateEdit: TemplateRef<NgxExcelColumnTemplateContext<T>>;
    @Input() templateHead: TemplateRef<NgxExcelColumnTemplateContext<T>>;

    constructor(
        protected excelService: NgxExcelService<T>,
        @Optional() @Inject(NgxExcelComponentRef) protected excelComponentRef: NgxExcelComponent<T>
    ) { }

    ngOnInit() {
        if (!this.excelComponentRef || !this.name) { return; }

        const excelColumn = {} as NgxExcelColumn<T>;
        const rule = this.excelService.getRule(this.name);

        excelColumn.name            = this.name || '';
        excelColumn.label           = this.label || (rule ? rule.label : '');
        excelColumn.width           = Math.max(typeof(this.width) === 'string' ? parseInt(this.width, 0) : this.width || 60, 60);
        excelColumn.computedWidth   = excelColumn.width;
        excelColumn.computedOffset  = 0;
        excelColumn.locked          = this.excelColumnLocked;
        excelColumn.readonly        = this.excelColumnReadOnly;
        excelColumn.invisible       = this.excelColumnInvisible;
        excelColumn.sortable        = this.excelColumnCanSort;

        excelColumn.columnType      = rule ? rule.columnType : NgxExcelColumnType.Text;
        excelColumn.selectOptions   = rule ? (
            [ NgxExcelColumnType.ForeignKey, NgxExcelColumnType.MultiForeignKey,
              NgxExcelColumnType.SelectOption, NgxExcelColumnType.MultiSelectOption,
              NgxExcelColumnType.TagsSelectOption ].indexOf(rule.columnType) >= 0 ? rule.selectOptions || [] : []
        ) : [];

        if (rule) {
            if ([ NgxExcelColumnType.ForeignKey, NgxExcelColumnType.MultiForeignKey ].indexOf(rule.columnType) >= 0) {
                excelColumn.relativeService = rule.relativeService || null;
            } else {
                excelColumn.relativeService = null;
            }
            excelColumn.labelKey = rule.labelKey || 'label';
            excelColumn.typeaheadKey = rule.typeaheadKey || '';
        } else {
            excelColumn.relativeService = null;
            excelColumn.labelKey = 'label';
            excelColumn.typeaheadKey = '';
        }

        excelColumn.template        = this.template || null;
        excelColumn.templateEdit    = this.templateEdit || null;
        excelColumn.templateHead    = this.templateHead || null;
        /* if (excelColumn.templateEdit) {
            excelColumn.readonly = false;
        } */

        if (excelColumn.name.length === 0 || excelColumn.label.length === 0) { return; }

        this.excelComponentRef.addExcelColumn(excelColumn);
    }
}
