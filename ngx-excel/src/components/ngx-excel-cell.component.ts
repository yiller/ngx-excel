import { Component, OnInit, Input, HostListener, HostBinding, Output, EventEmitter, TemplateRef, ViewChild } from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { TextMaskConfig } from 'angular2-text-mask';
import { NgxExcelColumn, NgxExcelCellSelectedEvent, NgxExcelColumnTemplateContext, NgxExcelCellMode, NgxExcelColumnType } from '../models';
import { NgxExcelCellDoubleClickedEvent, NgxExcelCellEvent } from '../models/ngx-excel-cell.model';
import createNumberInputMask from '../input-mask-addons/createNumberInputMask';
import createCurrencyInputMask from '../input-mask-addons/createCurrencyInputMask';
import createDateTimeInputMask from '../input-mask-addons/createDateTimeInputMask';
import { NgxExcelCellContract } from './ngx-excel-cell.contract';
import { parseZone } from 'moment';
import { pascalCase } from 'change-case';
import { Subject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap, switchMap } from 'rxjs/operators';

@Component({
    selector: 'ngx-excel-cell[normalCell]',
    templateUrl: './ngx-excel-cell.component.html'
})

export class NgxExcelCellComponent<T> extends NgxExcelCellContract<T> implements OnInit {

    context: T;
    componentValue: any;
    componentMode: NgxExcelCellMode = NgxExcelCellMode.ReadMode;

    selectForeignContextTypeahead = false;
    selectForeignContextLoading = false;
    selectForeignContextTypeaheadInput$: Subject<string>;
    selectForeignContext$: Observable<any>;
    selectForeignContexts: any[] = [];

    inputMaskTextNumber: TextMaskConfig;
    inputMaskNumber: TextMaskConfig;
    inputMaskCurrency: TextMaskConfig;
    inputMaskDate: TextMaskConfig;
    inputMaskTime: TextMaskConfig;
    inputMaskDateTime: TextMaskConfig;

    protected excelCellReadOnly = false;
    protected excelCellEditOnly = false;
    protected doubleClickTicker = 0;
    protected doubleClickTn = null;
    protected contextMenuComponent: ContextMenuComponent;
    protected onSelectedCallback: (_: NgxExcelCellComponent<T>, column: NgxExcelColumn<T>, context: T) => void;
    protected onChangedCallback: (_: NgxExcelCellComponent<T>, column: NgxExcelColumn<T> | string, value: any) => void;
    protected disabledFn: (context: T) => boolean = null;
    protected temporaryDisabledFn: (context: T) => boolean = null;
    protected temporaryIsExcelCellDisabled = false;

    @Input() template: TemplateRef<NgxExcelColumnTemplateContext<T>>;
    @Input() templateEdit: TemplateRef<NgxExcelColumnTemplateContext<T>>;

    @Input()
    set disabled(value: boolean | ((context: T) => boolean)) {
        if (typeof (value) === 'function') {
            this.disabledFn = value;
        } else {
            this.isExcelCellDisabled = value === false ? false : true;
        }
    }
    get disabled(): boolean | ((context: T) => boolean) {
        return this.disabledFn ? this.disabledFn(this.context) : this.isExcelCellDisabled;
    }

    @Output() selectCell = new EventEmitter<NgxExcelCellSelectedEvent<T>>();
    @Output() doubleClickCell = new EventEmitter<NgxExcelCellDoubleClickedEvent<T>>();

    @HostBinding('class.selected') isExcelCellSelected = false;

    @HostBinding('class.disabled') isExcelCellDisabled = false;

    @HostListener('click', ['$event']) onExcelCellClicked(e: MouseEvent) {
        if (!this.context) { return; }

        if (this.onSelectedCallback) {
            this.onSelectedCallback(this, this.column, this.context);
        }

        if (this.isExcelCellSelected && this.doubleClickTicker > 0) {
            // 当前单元格已经是编辑模式或者单元格是只读 / 只写 / 禁用状态则不可能再次进入编辑模式
            if (this.componentMode === NgxExcelCellMode.EditMode ||
                this.excelCellReadOnly || this.excelCellEditOnly || this.disabled) {
                return;
            }
            // 双击 进入编辑模式
            this.componentMode = NgxExcelCellMode.EditMode;
            if (this.column.columnType === NgxExcelColumnType.ForeignKey || this.column.columnType === NgxExcelColumnType.MultiForeignKey) {
                const method = 'get' + pascalCase(this.column.name) + 'ForeignModels';
                if (this.column.selectOptions && this.column.selectOptions.length > 0) {
                    this.selectForeignContexts = [...this.column.selectOptions];
                } else if (this.ngxExcelService[method]) {
                    if (this.column.typeaheadKey) {
                        this.selectForeignContextTypeahead = true;
                        this.selectForeignContextLoading = true;
                        this.ngxExcelService[method](this.context).subscribe((contexts: any[]) => {
                            this.selectForeignContexts = [...contexts];
                            this.selectForeignContextLoading = false;
                        }, () => {
                            this.selectForeignContexts = [];
                            this.selectForeignContextLoading = false;
                        });
                        this.selectForeignContextTypeaheadInput$ = new Subject<string>();
                        this.selectForeignContextTypeaheadInput$.pipe(
                            debounceTime(200),
                            distinctUntilChanged(),
                            tap(() => this.selectForeignContextLoading = true),
                            switchMap((term) => this.ngxExcelService[method](this.context, term))
                        ).subscribe((contexts: any[]) => {
                            this.selectForeignContexts = [...contexts];
                            this.selectForeignContextLoading = false;
                        }, () => {
                            this.selectForeignContexts = [];
                            this.selectForeignContextLoading = false;
                        });
                    } else {
                        this.selectForeignContextLoading = true;
                        this.ngxExcelService[method](this.context).subscribe((contexts: any[]) => {
                            this.selectForeignContexts = [...contexts];
                            this.selectForeignContextLoading = false;
                        }, () => {
                            this.selectForeignContexts = [];
                            this.selectForeignContextLoading = false;
                        });
                    }
                } else {
                    this.selectForeignContexts = [];
                }

                /*if (this.column.selectOptions) {
                    this.foreignSelectContexts = [...this.column.selectOptions];
                } else if (this.ngxExcelService[method]) {
                    // this.setDisabledState();
                    this.ngxExcelService[method](this.context).subscribe((selectContexts: Array<any>) => {
                        this.foreignSelectContexts = [...selectContexts];
                        // this.restoreDisabledState();
                    });
                } else {
                    this.foreignSelectContexts = [];
                }*/
            }

            clearTimeout(this.doubleClickTn);
            this.doubleClickTicker = 0;
            this.doubleClickCell.emit({ column: this.column, context: this.context });
        } else {
            // 单击 选中
            this.doubleClickTicker += 1;
            clearTimeout(this.doubleClickTn);
            this.doubleClickTn = setTimeout(() => this.doubleClickTicker = 0, 2000);
            if (!this.isExcelCellSelected) {
                this.isExcelCellSelected = true;
                this.selectCell.emit({ column: this.column, context: this.context });
            }
        }
    }

    @HostListener('contextmenu', ['$event']) onContextMenu(e: MouseEvent) {
        clearTimeout(this.doubleClickTn);
        this.doubleClickTicker = 0;
        this.isExcelCellSelected = true;
        if (this.onSelectedCallback) {
            this.onSelectedCallback(this, this.column, this.context);
        }
        if (!this.contextMenuComponent) {
            return;
        }
        this.contextMenuService.show.next({
            contextMenu: this.contextMenuComponent,
            event: e,
            item: { context: this.context, column: this.column } as NgxExcelCellEvent<T>
        });
        e.preventDefault();
        e.stopPropagation();
    }

    templateHandle = (e: Event, name: string, value: any) => {
        if (!this.excelCellEditOnly) {
            this.componentMode = NgxExcelCellMode.ReadMode;
        }
        if (!this.onChangedCallback) { return; }
        this.onChangedCallback(this, name, value);
    }

    ngOnInit() {
        this.inputMaskTextNumber = createNumberInputMask({ preZero: true });
        this.inputMaskNumber = createNumberInputMask();
        this.inputMaskCurrency = createCurrencyInputMask();
        this.inputMaskDate = createDateTimeInputMask('YYYY-MM-DD', { min: '1900-01-01' });
        this.inputMaskTime = createDateTimeInputMask('HH:mm');
        this.inputMaskDateTime = createDateTimeInputMask('YYYY-MM-DD HH:mm');
    }

    /**
     * 当组件值确认时执行
     * @param `Event` e
     * @return `void`
     */
    handleComponentValueChanged() {
        if (this.column.columnType === NgxExcelColumnType.ForeignKey || this.column.columnType === NgxExcelColumnType.MultiForeignKey) {
            this.selectForeignContexts = [];
        } else if (this.column.columnType === NgxExcelColumnType.Date) {
            if (!parseZone(this.componentValue, 'YYYY-MM-DD', true).isValid()) {
                this.componentValue = '';
            }
        } else if (this.column.columnType === NgxExcelColumnType.Time) {
            if (!parseZone(this.componentValue, 'HH:mm', true).isValid()) {
                this.componentValue = '';
            }
        } else if (this.column.columnType === NgxExcelColumnType.DateTime) {
            if (!parseZone(this.componentValue, 'YYYY-MM-DD HH:mm', true).isValid()) {
                this.componentValue = '';
            }
        }
        if (!this.excelCellEditOnly) {
            this.componentMode = NgxExcelCellMode.ReadMode;
        }
        if (!this.onChangedCallback) { return; }
        this.onChangedCallback(this, this.column, this.componentValue);
    }




    /**
     * 当绑定的模型发生变化时执行
     * @return `void`
     */
    protected onContextChanged() { }

    /**
     * 设置单元格模式
     * @param `boolean` readonly
     * @param `boolean` editonly
     * @return `void`
     */
    public setMode(context: T, readonly: boolean, editonly: boolean) {
        setTimeout(() => {
            this.context = context;
            this.componentValue = this.context ? this.context[this.column.name] : null;
        }, 200);

        this.excelCellReadOnly = readonly;
        this.excelCellEditOnly = editonly;

        if (this.excelCellReadOnly) {
            this.componentMode = NgxExcelCellMode.ReadMode;
        } else if (this.excelCellEditOnly) {
            this.componentMode = NgxExcelCellMode.EditMode;
        } else {
            this.componentMode = NgxExcelCellMode.ReadMode;
        }
    }

    /**
     * 设置单元格不可编辑
     * @return `void`
     */
    public setDisabledState() {
        this.temporaryDisabledFn = this.disabledFn;
        this.temporaryIsExcelCellDisabled = this.isExcelCellDisabled;
        this.disabledFn = null;
        this.isExcelCellDisabled = true;
    }

    /**
     * 恢复单元格编辑状态
     * @return `void`
     */
    public restoreDisabledState() {
        this.disabledFn = this.temporaryDisabledFn;
        this.isExcelCellDisabled = this.temporaryIsExcelCellDisabled;
        this.temporaryDisabledFn = null;
        this.temporaryIsExcelCellDisabled = false;
    }

    /**
     * 注册单元格的值变化回调事件
     * @param callback 回调函数
     */
    public registerOnChanged(callback: (_: NgxExcelCellComponent<T>, column: NgxExcelColumn<T> | string, value: any) => void) {
        this.onChangedCallback = callback;
    }

    /**
     * 注册单元格的选择回调事件
     * @param callback 回调函数
     */
    public registerOnSelected(callback: (_: NgxExcelCellComponent<T>, column: NgxExcelColumn<T>, context: T) => void) {
        this.onSelectedCallback = callback;
    }

    /**
     * 注册单元格上下文菜单
     * @param `ContextMenuComponent` contextMenuComponent
     * @return `void`
     */
    public registerContextMenu(contextMenuComponent: ContextMenuComponent) {
        this.contextMenuComponent = contextMenuComponent;
    }

    /**
     * 外部调用单元格被选中
     * @return `void`
     */
    public focus() {
        clearTimeout(this.doubleClickTn);
        this.doubleClickTicker = 0;
        this.isExcelCellSelected = true;
        if (this.onSelectedCallback) {
            this.onSelectedCallback(this, this.column, this.context);
        }
    }

    /**
     * 外部调用单元格取消选中
     * @return `void`
     */
    public blur() {
        clearTimeout(this.doubleClickTn);
        this.doubleClickTicker = 0;
        this.isExcelCellSelected = false;
        if (!this.excelCellEditOnly) {
            // 失去焦点时编辑状态变为读模式
            this.componentMode = NgxExcelCellMode.ReadMode;
        }
    }


}
