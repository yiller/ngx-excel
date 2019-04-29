import { AfterContentInit, Component, ContentChildren, EventEmitter, Inject, Input, OnChanges, OnInit, Optional, Output, QueryList, SimpleChanges, HostBinding } from '@angular/core';
import { NgxExcelColumn, NgxExcelContextChanged } from '../models';
import { NgxExcelComponent, NgxExcelComponentRef } from '../ngx-excel.component';
import { NgxExcelService } from '../services/ngx-excel.service';
import { NgxExcelCellComponent } from './ngx-excel-cell.component';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import * as _ from 'lodash';

@Component({
    selector: 'ngx-excel-context',
    template: '<ng-content></ng-content>'
})

export class NgxExcelContextComponent<T> implements OnInit, OnChanges, AfterContentInit {

    protected selectedExcelCellComponent: NgxExcelCellComponent<T>;
    protected excelContextReadOnly = false;
    protected excelContextEditOnly = false;

    @Input() context: T;

    @Input()
    set readonly(value: boolean) { this.excelContextReadOnly = value === false ? false : true; }
    get readonly(): boolean { return this.excelContextReadOnly; }

    @Input()
    set editonly(value: boolean) { this.excelContextEditOnly = value === false ? false : true; }
    get editonly(): boolean { return this.excelContextEditOnly; }

    @Input() error: (err: any) => any;
    @Output() changeContext = new EventEmitter<NgxExcelContextChanged<T>[]>();

    @HostBinding('class.normal') normalClass = true;

    @ContentChildren(NgxExcelCellComponent) protected excelCellComponents: QueryList<NgxExcelCellComponent<T>>;

    constructor(
        protected ngxExcelService: NgxExcelService<T>,
        @Optional() @Inject(NgxExcelComponentRef) protected excelComponentRef: NgxExcelComponent<T>
    ) { }

    ngOnInit() {
        this.normalClass = !this.excelContextReadOnly && !this.excelContextEditOnly;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!changes['context'] || changes['context'].isFirstChange()) { return; }
        this.excelCellComponents.forEach((excelCellComponent) => {
            excelCellComponent.setMode(this.context, this.readonly, this.editonly);
        });
    }

    ngAfterContentInit() {
        const contextMenuComponent = this.excelComponentRef ? this.excelComponentRef.getContextMenuComponent() : null;
        this.excelCellComponents.forEach((excelCellComponent) => {
            // 设置注册单元格模式
            excelCellComponent.setMode(this.context, this.readonly, this.editonly);
            // 注册所有单元格组件的 onChanged 事件
            excelCellComponent.registerOnChanged((cell, column, value) => this.handleExcelCellChanged(cell, column, value));
            // 注册所有单元格组件的 onSelected 事件
            excelCellComponent.registerOnSelected((cell: NgxExcelCellComponent<T>) => this.handleExcelCellSelected(cell));
            // 注册上下文菜单
            excelCellComponent.registerContextMenu(contextMenuComponent);
        });
    }

    /**
     * 当单元格值变化时应同步传出 context
     * @param cell 当前变化的单元格组件
     * @param column 当前变化的列组件或上下文模型键名
     * @param value 变化后的值
     */
    protected handleExcelCellChanged(cell: NgxExcelCellComponent<T>, column: NgxExcelColumn<T> | string, value: any) {
        const name = typeof(column) === 'string' ? column : column.name;
        const context = _.clone(this.context);
        context[name] = value;

        this.excelCellComponents.forEach((excelCellComponent) => excelCellComponent.setDisabledState());
        this.ngxExcelService.handleModelChanged(this.context, context, name).subscribe((changedContexts) => {
            this.changeContext.emit(changedContexts);
            this.excelCellComponents.forEach((excelCellComponent) => excelCellComponent.restoreDisabledState());
        }, (err) => {
            this.getErrorHandles()(err);
            if (err.original) { this.changeContext.emit(err.original); }
            this.excelCellComponents.forEach((excelCellComponent) => excelCellComponent.restoreDisabledState());
        });
    }

    /**
     * 当单元格被选中时应取消之前选择的单元格
     * @param excelCellComponent 单元格组件对象
     */
    protected handleExcelCellSelected(excelCellComponent: NgxExcelCellComponent<T>) {
        if (this.excelComponentRef) {
            this.excelComponentRef.handleExcelCellSelected(excelCellComponent);
            return;
        }

        if (this.selectedExcelCellComponent && this.selectedExcelCellComponent !== excelCellComponent) {
            this.selectedExcelCellComponent.blur();
        }
        this.selectedExcelCellComponent = excelCellComponent;
    }

    /**
     * 获得错误处理函数, 有 NgxExcelComponent 则优先用 NgxExcelComponent 否则用自身的 error 函数
     */
    protected getErrorHandles() {
        return this.excelComponentRef ? this.excelComponentRef.getErrorHandles() : (this.error || ((err: any) => err && console.warn(err.message || err)));
    }
}
