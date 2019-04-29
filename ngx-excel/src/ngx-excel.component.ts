import { Component, OnInit, Input, ElementRef, AfterViewInit, forwardRef, InjectionToken, ChangeDetectorRef, Renderer2, ViewChild, ViewContainerRef, TemplateRef, EmbeddedViewRef, OnDestroy, NgZone, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ContextMenuComponent, IContextMenuClickEvent, ContextMenuService } from 'ngx-contextmenu';
import { NgxExcelService } from './services/ngx-excel.service';
import { NgxExcelColumnType } from './models/ngx-excel.enum';
import { NgxExcelColumn, NgxExcelRow, NgxExcelRowTemplateContext, NgxExcelAction, NgxExcelActionScope, NgxExcelContextMenuClickedEvent, NgxExcelContextToggledEvent, NgxExcelContextToggleState, NgxExcelContextChanged, NgxExcelHttpResponse } from './models';
import { NgxExcelCellComponent } from './components/ngx-excel-cell.component';
import { NgxExcelAggregateService } from './services/ngx-excel-aggregate.service';
import { Observable, of, Subscription, fromEvent, Subject, BehaviorSubject } from 'rxjs';
import { map, mergeMap, debounceTime, distinctUntilChanged, catchError, filter, tap, share } from 'rxjs/operators';

const enum NgxExcelComponentState {
    Initial     = 'initial',
    Normal      = 'normal',
    Complete    = 'complete',
    Loading     = 'loading',
    Restoring   = 'restoring'
}

interface NgxExcelAnchorItem {
    index:  number;
    offset: number;
}

export const NgxExcelComponentRef = new InjectionToken<NgxExcelComponent<never>>('NgxExcelComponent');

@Component({
    selector: 'ngx-excel',
    templateUrl: './ngx-excel.component.html',
    providers: [
        { provide: NgxExcelComponentRef, useExisting: forwardRef(() => NgxExcelComponent) }
    ]
})

export class NgxExcelComponent<T> implements OnInit, OnDestroy, AfterViewInit {

    excelVerticalScrollBarWidth = 18;
    excelHorizontalScrollBarHeight = 15;
    excelHandleColumn: NgxExcelColumn<T>;
    excelColumns: NgxExcelColumn<T>[] = [];
    excelRows: NgxExcelRow<T>[] = [];
    excelRowHeight = 40;
    excelRowsReflection: { [name: string]: number } = {};       // 行反射
    excelRowLoadedCount = 0;
    excelRowTotal = 0;
    excelBeginAttachedItem: number;
    excelEndAttachedItem: number;
    excelPrefixActions: Array<NgxExcelAction<T>> = [];
    excelGlobalActions: Array<NgxExcelAction<T>> = [];
    excelContextActions: Array<NgxExcelAction<T>> = [];
    excelColumnActions: Array<NgxExcelAction<T>> = [];
    excelCacheEnabled = false;
    excelToggleColumnEnabled = false;
    excelMetas: { [name: string]: any } = {};
    subscribeScoll: any;
    subscriptionExcelBar: any;

    protected excelCacheKey = '';
    protected excelReadOnly = false;
    protected excelAutoFocus = false;
    protected excelLazyLoad = false;
    protected excelFilterable = false;
    // protected excelWrapperEl: HTMLElement = null;
    protected excelEl: HTMLElement = null;
    protected excelHeadEl: HTMLElement = null;
    protected excelBodyEl: HTMLElement = null;
    protected excelFootEl: HTMLElement = null;
    protected excelScrollBarX: HTMLElement = null;
    protected excelScrollBarXPercent = 0;
    protected excelScrollElPercent = 0;
    protected excelComponentState: NgxExcelComponentState = NgxExcelComponentState.Initial;
    protected excelComponentSubscription = new Subscription();
    protected excelBodyHeight = 0;
    protected excelTombstones: EmbeddedViewRef<null>[] = [];
    protected excelPageNum = 1;
    protected excelPageSize = 100;
    protected excelPageSizeUnit = 100;
    protected excelAnchorItem: NgxExcelAnchorItem = { index: 0, offset: 0 };
    protected excelScreenItem: NgxExcelAnchorItem = { index: 0, offset: 0 };

    protected excelAnchorScrollTop = 0;
    protected excelAnchorScrollRunwayEnd = 0;

    protected excelGlobalFilters: {
        [param: string]: string | string[]
    } = {};
    protected excelGlobalMetas: string[] = [];
    protected excelGlobalMetasSubject = new BehaviorSubject<{ [name: string]: any }>(null);
    protected excelInvisibleColumns: string[] = [];

    protected selectedExcelCellComponent: NgxExcelCellComponent<T>;
    protected selectedExcelColumn: NgxExcelColumn<T>;
    protected selectedContext: T;

    protected contextChangedSubject = new Subject<NgxExcelContextChanged<T>[]>();

    protected scrolling = false;
    protected scrollingTimeOut = null;
    protected scrollbarScrolling = false;
    protected tableScrolling = false;
    protected componentStageState: NgxExcelComponentState = null;

    set componentState(value: NgxExcelComponentState) {
        this.excelComponentState = value;
        // if (!this.excelWrapperEl) { return; }
        if ([NgxExcelComponentState.Initial, NgxExcelComponentState.Loading].indexOf(value) >= 0) {
            // this.excelWrapperEl.classList.add('state-loading');
        } else {
            // this.excelWrapperEl.classList.remove('state-loading');
        }
    }
    get componentState(): NgxExcelComponentState {
        return this.excelComponentState;
    }

    @Input()
    set readonly(value: boolean) { this.excelReadOnly = value === false ? false : true; }
    get readonly(): boolean { return this.excelReadOnly; }

    @Input()
    set autoFocus(value: boolean) { this.excelAutoFocus = value === false ? false : true; }
    get autoFocus(): boolean { return this.excelAutoFocus; }

    @Input()
    set lazyload(value: boolean) { this.excelLazyLoad = value === false ? false : true; }
    get lazyload(): boolean { return this.excelLazyLoad; }

    // @Input() wrapperSelector = '.page-container';
    @Input() cellHeight: number;
    @Input()
    set name(value: string) {
        if (!value && value.length === 0) { return; }
        this.excelCacheKey = value.indexOf('excel') === 0 ? value : ('excel_' + value);
        this.excelCacheEnabled = true;
        this.excelToggleColumnEnabled = true;
    }
    @Input() error: (err: any) => any;

    @ViewChild('excelRowTpl') protected excelRowTplRef: TemplateRef<NgxExcelRowTemplateContext<T>>;
    @ViewChild(ContextMenuComponent) protected contextMenuComponent: ContextMenuComponent;
    @ViewChild('filtersContextMenu') protected filtersContextMenuComponent: ContextMenuComponent;

    @HostListener('contextmenu', ['$event'])
    onContextMenu(e: MouseEvent) {
        if (!this.contextMenuComponent) {
            return;
        }
        this.contextMenuService.show.next({
            contextMenu: this.contextMenuComponent,
            event: e,
            item: { context: null, column: null }
        });
        e.preventDefault();
        e.stopPropagation();
    }

    displayFiltersContextMenu(e: MouseEvent) {
        if (!this.filtersContextMenuComponent) {
            return;
        }
        this.contextMenuService.show.next({
            contextMenu: this.filtersContextMenuComponent,
            event: e,
            item: { context: null, column: null }
        });
        e.preventDefault();
        e.stopPropagation();
    }

    constructor(
        protected el: ElementRef,
        protected renderer2: Renderer2,
        protected cdr: ChangeDetectorRef,
        protected ngZone: NgZone,
        protected httpClient: HttpClient,
        protected contextMenuService: ContextMenuService,
        protected ngxExcelService: NgxExcelService<T>
    ) { }

    ngOnInit() {
        // 默认的句柄列
        this.excelHandleColumn = {
            name: '', label: '',
            width: 6, computedWidth: 6, computedOffset: 0,
            locked: true, readonly: true, invisible: false, sortable: false,
            columnType: NgxExcelColumnType.Text, allowNegative: false, selectOptions: [], relativeService: null, labelKey: 'label', typeaheadKey: '',
            template: null, templateEdit: null, templateHead: null
        };
        this.excelRowHeight = Math.max(typeof (this.cellHeight) === 'string' ? parseInt(this.cellHeight, 0) : this.cellHeight || 40, 40);
        this.excelInvisibleColumns = this.getInvisibleColumns();
        this.restoreStage();
    }

    ngOnDestroy() {
        this.excelRows.forEach((excelRow) => {
            excelRow.top = -1;
        });
        this.cacheStage();
        this.excelComponentSubscription.unsubscribe();
    }

    ngAfterViewInit() {
        // this.excelWrapperEl = this.wrapperSelector ? document.querySelector(this.wrapperSelector) : this.el.nativeElement;
        this.excelEl = this.el.nativeElement.querySelector('.excel');
        this.excelHeadEl = this.el.nativeElement.querySelector('.excel-head');
        this.excelBodyEl = this.el.nativeElement.querySelector('.excel-body');
        this.excelFootEl = this.el.nativeElement.querySelector('.excel-foot');
        this.excelScrollBarX = this.el.nativeElement.querySelector('.excel-foot .scrollbar-x');

        if (this.lazyload) {
            this.componentState = NgxExcelComponentState.Normal;
        } else if (this.componentState !== NgxExcelComponentState.Restoring) {
            this.componentState = NgxExcelComponentState.Initial;
        }

        this.registerWindowResized();
        this.registerExcelBodyScrolled();
        this.registerScrollBarScrolled();
        this.rebuildUi();
    }

    /**
     * 反转列显示
     * @param _ 菜单点击事件
     * @param column 关联的表格列
     */
    toggleExcelColumn(_: IContextMenuClickEvent, column: NgxExcelColumn<T>) {
        column.invisible = !column.invisible;
        if (column.name.length > 0) {
            if (column.invisible) {
                this.excelInvisibleColumns.push(column.name);
            } else {
                this.excelInvisibleColumns = this.excelInvisibleColumns.filter((invisibleColumn) => invisibleColumn !== column.name);
            }
            this.cacheInvisibleColumns();
        }
        this.rebuildUi();
    }

    /**
     * 当上下文被修改时执行
     * @param e 上下文修改事件携带当前变更的上下文
     */
    handleContextChanged(e: NgxExcelContextChanged<T>[]) {
        if (this.excelReadOnly) { return; }
        this.handleChangedContexts(e);
    }

    /**
     * 当菜单被点击时执行
     * @param _ 菜单点击事件携带当前操作的上下文
     * @param action 关联的操作动作
     */
    handleContextMenuClicked(_: IContextMenuClickEvent, action: NgxExcelAction<T>) {
        const payload = <NgxExcelContextMenuClickedEvent<T>>_.item;
        payload.action = action;

        let resultCallback: Observable<NgxExcelContextChanged<T>[]>;
        let innerCall = true;

        if (payload.action.execute) {
            // 定义了 execute 属性由 Component 接管
            resultCallback = payload.action.execute(payload) || null;
            innerCall = false;
        } else if (typeof (this.ngxExcelService[payload.action.action]) !== 'undefined') {
            // 定义了 payload.action.action 方法由 Service 接管
            resultCallback = payload.action.actionScope === NgxExcelActionScope.Excel ?
                this.ngxExcelService[payload.action.action]() :
                this.ngxExcelService[payload.action.action](payload.context);
        }

        if (!resultCallback) { return; }

        const componentState = this.componentState;
        if (innerCall) {
            this.componentState = NgxExcelComponentState.Loading;
        }
        resultCallback.subscribe((changedContexts) => {
            if (payload.action.actionScope === NgxExcelActionScope.Excel) {
                this.handleChangedContexts(changedContexts);
            } else {
                this.handleChangedContexts(changedContexts, payload.context);
            }
            if (innerCall) {
                this.componentState = componentState;
            }
        }, (err) => {
            this.getErrorHandles()(err);
            if (innerCall) {
                this.componentState = componentState;
            }
        });
    }

    /**
     * 当上下文发生变化时执行
     * @param changedContexts 发生变化的上下文列表
     * @param relativedContext 相关的上下文
     */
    public handleChangedContexts(changedContexts: NgxExcelContextChanged<T>[], relativedContext?: T) {
        changedContexts.forEach((changedContext) => {
            if (changedContext.action === 'prepend' || changedContext.action === 'append') {
                let index: number;
                if (changedContext.relativedContext || relativedContext) {
                    const primaryKey = this.ngxExcelService.getPrimaryKey(changedContext.relativedContext || relativedContext);
                    index = this.excelRowsReflection[primaryKey];
                } else if (changedContext.action === 'prepend') {
                    index = 0;
                } else {
                    index = this.excelRows.length - 1;
                }

                const begin = changedContext.action === 'prepend' ? index : index + 1;
                const excelRows = [];
                (changedContext.contexts ? changedContext.contexts : [changedContext.context]).forEach((context, i) => {
                    const excelRow = this.createExcelRow();
                    excelRow.context = context;
                    excelRow.primaryKey = this.ngxExcelService.getPrimaryKey(context);
                    excelRows.push(excelRow);
                    this.excelRowsReflection[excelRow.primaryKey] = begin + i;
                });

                // 修改行后所有行的位置索引
                for (let i = begin; i < this.excelRows.length; i++) {
                    const excelRowPrimaryKey = this.excelRows[i].primaryKey;
                    const excelRowIndex = this.excelRowsReflection[excelRowPrimaryKey];
                    if (excelRowIndex !== null && excelRowIndex !== undefined) {
                        this.excelRowsReflection[excelRowPrimaryKey] = excelRowIndex + excelRows.length;
                    }
                }

                // 插入行并更新统计信息
                this.excelRows.splice(begin, 0, ...excelRows);
                this.excelRowLoadedCount += excelRows.length;
                this.excelRowTotal += excelRows.length;
                this.excelAnchorScrollRunwayEnd = this.excelRowLoadedCount * this.excelRowHeight;
                this.handleExcelBodyScrolled();
            } else if (changedContext.action === 'updated') {
                const relativePrimaryKey = changedContext.relativedContext ? this.ngxExcelService.getPrimaryKey(changedContext.relativedContext) : null;
                (changedContext.contexts ? changedContext.contexts : [ changedContext.context ]).forEach((context) => {
                    const primaryKey = this.ngxExcelService.getPrimaryKey(context);
                    const index = this.excelRowsReflection[relativePrimaryKey || primaryKey];
                    if (index === null || index === undefined) { return; }
                    this.excelRowsReflection[primaryKey] = index;
                    if (relativePrimaryKey && relativePrimaryKey !== primaryKey) {
                        delete this.excelRowsReflection[relativePrimaryKey];
                    }
                    this.excelRows[index].primaryKey = primaryKey;
                    this.excelRows[index].context = context;
                });
            } else {
                // 注意跨行删除
                let removedRowCount = 0;
                (changedContext.contexts ? changedContext.contexts : [changedContext.context]).forEach((context) => {
                    const primaryKey = this.ngxExcelService.getPrimaryKey(context);
                    const index = this.excelRowsReflection[primaryKey];
                    if (index === null || index === undefined) { return; }
                    delete this.excelRowsReflection[primaryKey];

                    // 修改行后所有行的位置索引
                    for (let i = index + 1; i < this.excelRows.length; i++) {
                        const excelRowPrimaryKey = this.excelRows[i].primaryKey;
                        const excelRowIndex = this.excelRowsReflection[excelRowPrimaryKey];
                        if (excelRowIndex !== null && excelRowIndex !== undefined) {
                            this.excelRowsReflection[excelRowPrimaryKey] = Math.max(0, excelRowIndex - 1);
                        }
                    }
                    // 删除行
                    this.excelRows.splice(index, 1);
                    removedRowCount++;
                });

                // 更新统计信息
                this.excelRowLoadedCount -= removedRowCount;
                this.excelRowTotal -= removedRowCount;
                this.excelAnchorScrollRunwayEnd = this.excelRowLoadedCount * this.excelRowHeight;
                this.handleExcelBodyScrolled();
            }
        });
    }

    /**
     * 当行折叠/展开被触发时执行
     * @param _ 当前操作的反转事件携带当前的上下文
     */
    /*public handleExcelContextToggled(_: NgxExcelContextToggledEvent<T>): Observable<boolean> {
        if (!_.context || !(this.ngxExcelService instanceof NgxExcelAggregateService)) { return of(false); }
        if (_.currentState === NgxExcelContextToggleState.Collapse) {
            // 折叠
            const primaryKey = this.ngxExcelService.getPrimaryKey(_.context);
            const index = this.excelRowsReflection[primaryKey];
            // const index = this.excelRowsReflection.get(primaryKey);
            if (index === null || index === undefined) { return; }

            let willRemoveCount = 0;
            for (let i = index + 1; i < this.excelRows.length; i++) {
                if (!this.ngxExcelService.isChild(_.context, this.excelRows[i].context)) {
                    // console.log(_.context, this.excelRows[i].context);
                    break;
                }
                delete this.excelRowsReflection[this.excelRows[i].primaryKey];
                // this.excelRowsReflection.delete(this.excelRows[i].primaryKey);
                willRemoveCount++;
            }
            // 修改行后所有行的位置索引
            for (let i = index + willRemoveCount + 1; i < this.excelRows.length; i++) {
                const excelRowPrimaryKey = this.excelRows[i].primaryKey;
                // const excelRowIndex = this.excelRowsReflection.get(excelRowPrimaryKey);
                const excelRowIndex = this.excelRowsReflection[excelRowPrimaryKey];
                if (excelRowIndex >= 0) {
                    // this.excelRowsReflection.set(excelRowPrimaryKey, Math.max(0, excelRowIndex - willRemoveCount));
                    this.excelRowsReflection[excelRowPrimaryKey] = Math.max(0, excelRowIndex - willRemoveCount);
                }
            }
            // 删除行并更新统计信息
            this.excelRows.splice(index + 1, willRemoveCount);
            this.excelRowLoadedCount -= willRemoveCount;
            this.excelRowTotal -= willRemoveCount;
            this.excelAnchorScrollRunwayEnd = this.excelRowLoadedCount * this.excelRowHeight;
            this.handleExcelBodyScrolled();
            return of(true);
        } else {
            // 展开
            const primaryKey = this.ngxExcelService.getPrimaryKey(_.context);
            const index = this.excelRowsReflection[primaryKey];
            // const index = this.excelRowsReflection.get(primaryKey);
            if (index === null || index === undefined) { return; }

            return this.ngxExcelService.getChildren(_.context, Object.assign({}, this.excelGlobalFilters)).pipe(
                map((children: T[]) => {
                    const excelRows = [];
                    children.forEach((child, i) => {
                        const excelRow = this.createExcelRow();
                        excelRow.context = child;
                        excelRow.primaryKey = this.ngxExcelService.getPrimaryKey(child);
                        excelRows.push(excelRow);
                        this.excelRowsReflection[excelRow.primaryKey] = index + i + 1;
                        // this.excelRowsReflection.set(excelRow.primaryKey, index + i + 1);
                    });
                    // 修改行后所有行的位置索引
                    for (let i = index + 1; i < this.excelRows.length; i++) {
                        const excelRowPrimaryKey = this.excelRows[i].primaryKey;
                        // const excelRowIndex = this.excelRowsReflection.get(excelRowPrimaryKey);
                        const excelRowIndex = this.excelRowsReflection[excelRowPrimaryKey];
                        if (excelRowIndex >= 0) {
                            this.excelRowsReflection[excelRowPrimaryKey] = excelRowIndex + excelRows.length;
                            // this.excelRowsReflection.set(excelRowPrimaryKey, excelRowIndex + excelRows.length);
                        }
                    }
                    // 插入行并更新统计信息
                    this.excelRows.splice(index + 1, 0, ...excelRows);
                    this.excelRowLoadedCount += excelRows.length;
                    this.excelRowTotal += excelRows.length;
                    this.excelAnchorScrollRunwayEnd = this.excelRowLoadedCount * this.excelRowHeight;
                    this.handleExcelBodyScrolled();
                    return true;
                }),
                catchError((err) => {
                    this.getErrorHandles()(err);
                    return of(false);
                })
            );
        }
    }*/

    /**
     * 重新加载数据
     */
    public reload() {
        if (this.componentState === NgxExcelComponentState.Initial ||
            this.componentState === NgxExcelComponentState.Loading ||
            this.componentState === NgxExcelComponentState.Restoring
        ) { return; }

        this.clearStage();

        this.excelRows = [];
        this.excelComponentState = NgxExcelComponentState.Initial;
        this.excelPageNum = 1;
        this.excelRowTotal = 0;
        this.excelRowLoadedCount = 0;
        this.el.nativeElement.scrollTop = 0;
        this.el.nativeElement.scrollLeft = 0;

        this.loadExcelRows().subscribe(() => this.handleExcelBodyScrolled());
    }

    /**
     * 设置 Excel 进入 loading 状态
     */
    public loading() {
        if (this.componentState === NgxExcelComponentState.Initial ||
            this.componentState === NgxExcelComponentState.Loading ||
            this.componentState === NgxExcelComponentState.Restoring
        ) { return; }
        this.componentStageState = this.componentState;
        this.componentState = NgxExcelComponentState.Loading;
    }

    /**
     * 恢复 Excel 状态
     */
    public restoreState() {
        this.componentState = this.componentStageState;
        this.componentStageState = null;
    }

    /**
     * 重建UI
     */
    public rebuildUi() {
        const componentWidth = parseInt(getComputedStyle(this.el.nativeElement, null).width, 0) - this.excelHandleColumn.width - this.excelVerticalScrollBarWidth; // advanced-table { margin: 0 12px; }
        const expectedColumnsWidth = this.excelColumns.filter((excelColumn) => !excelColumn.invisible).map((excelColumn) => excelColumn.width).reduce((previous, current) => previous + current);
        let computedComponentWidth = 0;
        if (expectedColumnsWidth < componentWidth) {
            // 宽度补齐
            this.excelColumns.forEach((excelColumn, index) => {
                if (excelColumn.invisible) { return; }
                excelColumn.computedOffset = computedComponentWidth + this.excelHandleColumn.width;
                if (index === this.excelColumns.length - 1) {
                    // 最后一列
                    excelColumn.computedWidth = componentWidth - computedComponentWidth;
                    computedComponentWidth = componentWidth;
                } else {
                    // 其他列
                    excelColumn.computedWidth = Math.floor(componentWidth * excelColumn.width / expectedColumnsWidth);
                    computedComponentWidth += excelColumn.computedWidth;
                }
            });
        } else {
            // 宽度溢出
            this.excelColumns.forEach((excelColumn) => {
                if (excelColumn.invisible) { return; }
                excelColumn.computedWidth = excelColumn.width;
                excelColumn.computedOffset = computedComponentWidth + this.excelHandleColumn.width;
                computedComponentWidth += excelColumn.computedWidth;
            });
        }
        this.cdr.detectChanges();

        // 强制监听浏览器宽度改变需要重建UI(排除无法监听的情况)
        const finalComponentWidth = computedComponentWidth + this.excelHandleColumn.width;
        this.renderer2.setStyle(this.excelHeadEl, 'width', finalComponentWidth + 'px');
        this.renderer2.setStyle(this.excelBodyEl, 'width', finalComponentWidth + 'px');
        this.renderer2.setStyle(this.excelFootEl, 'width', parseInt(getComputedStyle(this.el.nativeElement, null).width, 0) - this.excelVerticalScrollBarWidth + 'px');

        // 滚动条宽度计算
        const scrollBarOuterWidth = parseInt(getComputedStyle(this.excelScrollBarX, null).width, 0);
        this.excelScrollBarXPercent = Math.round((scrollBarOuterWidth / componentWidth) * 10000) / 10000;
        this.excelScrollElPercent = Math.round((componentWidth / scrollBarOuterWidth) * 10000) / 10000;
        const scrollBarWidth = Math.ceil(computedComponentWidth * this.excelScrollBarXPercent);
        this.renderer2.setStyle(this.excelScrollBarX, 'width', scrollBarOuterWidth + 'px');
        this.renderer2.setStyle(this.excelScrollBarX.querySelector('span'), 'width', scrollBarWidth + 'px');

        // 计算Body可见区域的宽高
        const excelHeight = parseInt(getComputedStyle(this.el.nativeElement, null).height, 0);
        const excelHeadHeight = parseInt(getComputedStyle(this.excelHeadEl, null).height, 0);
        const excelFootHeight = parseInt(getComputedStyle(this.excelFootEl, null).height, 0);
        this.excelBodyHeight = excelHeight - excelHeadHeight - excelFootHeight;
        this.renderer2.setStyle(this.excelBodyEl, 'min-height', this.excelBodyHeight + 'px');

        // 计算页尺寸
        this.excelPageSize = Math.ceil(this.excelBodyHeight / (this.excelRowHeight * this.excelPageSizeUnit)) * this.excelPageSizeUnit;

        // 初始化数据行宽高
        this.excelRows.forEach((excelRow) => excelRow.width = excelRow.height = 0);

        if (this.lazyload) { return; }
        if (this.componentState === NgxExcelComponentState.Initial) {
            this.loadExcelRows().subscribe(() => this.handleExcelBodyScrolled());
        } else if (this.componentState === NgxExcelComponentState.Restoring) {
            // 如果是恢复状态，则需要设定Body高度和滚动条位置
            this.renderer2.setStyle(this.excelBodyEl, 'height', this.excelAnchorScrollRunwayEnd + 'px');
            setTimeout(() => {
                if (this.excelAnchorScrollTop) {
                    (this.el.nativeElement as HTMLElement).scrollTop = this.excelAnchorScrollTop;
                } else {
                    this.handleExcelBodyScrolled();
                }
                this.componentState = NgxExcelComponentState.Normal;
            }, 200);
        } else {
            this.handleExcelBodyScrolled();
        }
    }

    /**
     * 增加表格列
     * @param column 列定义
     */
    public addExcelColumn(column: NgxExcelColumn<T>) {
        column.computedWidth = column.width;
        column.computedOffset = 0;
        // 锁定列必须连续
        if (column.locked) {
            column.locked = this.excelColumns.filter((c) => !c.locked).length === 0;
        }

        // 非锁定列并且配置了隐藏列则不要显示列
        if (!column.locked && !column.invisible && column.name.length > 0) {
            column.invisible = this.excelInvisibleColumns.indexOf(column.name) >= 0;
        }

        // 表格只读的时候取消编辑模式的配置
        if (this.excelReadOnly) {
            column.readonly = true;
            column.templateEdit = null;
        }
        this.excelColumns.push(column);
    }

    /**
     * 删除表格列
     * @param name 列名称
     */
    public delExcelColumn(name: string) {
        const index = this.excelColumns.findIndex((excelColumn) => excelColumn.name === name);
        if (index < 0) { return; }
        this.excelColumns.splice(index, 1);
    }

    /**
     * 增加表格操作项
     * @param action 操作项定义
     */
    public addExcelAction(action: NgxExcelAction<T>) {
        if (action.invisible) {
            action.visible = () => false;
        } else {
            action.visible = ({ context, column }) => {
                if (action.actionScope === NgxExcelActionScope.Column && (!context || !column)) {
                    return false;
                }
                if (action.actionScope === NgxExcelActionScope.Context && !context) {
                    return false;
                }
                return this.ngxExcelService.privilege(context, action.action);
            };
        }

        if (action.disabled) {
            action.enabled = () => false;
        } else {
            action.enabled = ({ context, column }) => {
                if (action.actionScope === NgxExcelActionScope.Column && (!context || !column)) {
                    return false;
                }
                if (action.actionScope === NgxExcelActionScope.Context && !context) {
                    return false;
                }
                return this.ngxExcelService.can(context, action.action);
            };
        }

        switch (action.actionScope) {
            case NgxExcelActionScope.Excel:
                if (action.prefix) {
                    this.excelPrefixActions.push(action);
                } else {
                    this.excelGlobalActions.push(action);
                }
                break;
            case NgxExcelActionScope.Context:
                this.excelContextActions.push(action);
                break;
            case NgxExcelActionScope.Column:
                this.excelContextActions.push(action);
                break;
        }
    }

    /**
     * 当单元格选中时执行
     * @param excelCellComponent 被选中的单元格
     */
    public handleExcelCellSelected(excelCellComponent: NgxExcelCellComponent<T>) {
        if (this.selectedExcelCellComponent && this.selectedExcelCellComponent !== excelCellComponent) {
            this.selectedExcelCellComponent.blur();
        }
        this.selectedExcelCellComponent = excelCellComponent;
    }

    /**
     * 获得上下文菜单
     */
    public getContextMenuComponent(): ContextMenuComponent {
        return this.contextMenuComponent;
    }

    /**
     * 获得错误处理函数
     */
    public getErrorHandles() {
        return this.error || ((err: any) => err && console.warn(err.message || err));
    }

    /**
     * 绑定全局搜索条件
     * @param filters 全局搜索条件
     */
    public bindGlobalFilters(filters: { [param: string]: string | string[] }) {
        this.excelGlobalFilters = filters;
    }

    /**
     * 绑定全局元数据请求字段
     * @param metas 全局元数据请求字段
     */
    public bindGlobalMetas(metas: string | string[]): Observable<{ [name: string]: any }> {
        this.excelGlobalMetas = Array.isArray(metas) ? [...metas] : [metas];
        return this.excelGlobalMetasSubject as Observable<{ [name: string]: any }>;
    }


    /**
     * 注册Window尺寸变化事件
    */
    protected registerWindowResized() {
        const subscription = fromEvent(window, 'resize').pipe(
            debounceTime(200),
            distinctUntilChanged()
        ).subscribe(() => this.rebuildUi());
        this.excelComponentSubscription.add(subscription);
    }

    /**
        * 注册Excel滚动事件
    */
    protected registerExcelBodyScrolled() {
        const source = fromEvent(this.el.nativeElement, 'scroll').pipe(
            // map((e: Event) => e.srcElement.scrollLeft),
            // distinctUntilChanged(),
            filter(() => !this.scrollbarScrolling),
            share()
        );

        this.excelComponentSubscription.add(
            source.pipe(debounceTime(200))
                .subscribe(() => this.tableScrolling = false)
        );

        this.excelComponentSubscription.add(
            source
                .pipe(tap(() => this.tableScrolling = true))
                .subscribe(() => {
                    this.handleExcelBodyScrolled();
                })
        );
    }


    /**
     * 注册ScrollBarX滚动事件
    */
    protected registerScrollBarScrolled() {
        const source = fromEvent(this.excelScrollBarX, 'scroll').pipe(
            map((e: Event) => (<HTMLElement>e.srcElement).scrollLeft),
            distinctUntilChanged(),
            filter(() => !this.tableScrolling),
            share()
        );

        this.excelComponentSubscription.add(
            source.pipe(debounceTime(200))
                .subscribe(() => this.scrollbarScrolling = false)
        );

        this.excelComponentSubscription.add(
            source
                .pipe(tap(() => this.scrollbarScrolling = true))
                .subscribe(() => {
                    this.handleScrollBarScrolled();
                })
        );
    }

    /**
    * 当滑动滚动条执行
    */
    protected handleScrollBarScrolled() {
        const radio = Math.ceil(this.excelEl.offsetWidth / this.excelScrollBarX.offsetWidth);
        const excelVerticalScrollLeft = Math.ceil(this.excelScrollBarX.scrollLeft * radio);
        this.el.nativeElement.scrollLeft = excelVerticalScrollLeft;
    }

    /**
     * 当Excel滚动时执行
    */
    protected handleExcelBodyScrolled() {
        this.excelScrollBarX.scrollLeft = Math.ceil(this.el.nativeElement.scrollLeft * this.excelScrollBarXPercent);
        // const delta = this.el.nativeElement.scrollTop - this.excelAnchorScrollTop;
        // this.excelAnchorItem = this.el.nativeElement.scrollTop === 0 ? { index: 0, offset: 0 } : this.calcAnchoredItem(this.excelAnchorItem, delta);
        this.excelAnchorItem = { index: 0, offset: 0 };
        this.excelAnchorScrollTop = this.el.nativeElement.scrollTop;
        this.excelAnchorItem.index = Math.floor(this.excelAnchorScrollTop / this.excelRowHeight);
        this.excelAnchorItem.offset = this.excelAnchorScrollTop - this.excelAnchorItem.index * this.excelRowHeight;
        const lastScreenItem = { index: 0, offset: 0 };
        lastScreenItem.index = Math.floor((this.excelAnchorScrollTop + this.excelBodyHeight) / this.excelRowHeight);
        lastScreenItem.offset = (this.excelAnchorScrollTop + this.excelBodyHeight) - lastScreenItem.index * this.excelRowHeight;
        // const lastScreenItem = this.calcAnchoredItem(this.excelAnchorItem, this.excelBodyHeight);
        if (lastScreenItem.index >= this.excelRowTotal) {
            lastScreenItem.index = this.excelRowTotal;
            lastScreenItem.offset = 0;
        }
        this.excelScreenItem = lastScreenItem;
        this.excelBeginAttachedItem = this.excelAnchorItem.index;
        this.excelEndAttachedItem = lastScreenItem.offset ? lastScreenItem.index : lastScreenItem.index - 1;
        this.attachContent();
    }

    /**
     * 填充内容，如果需要的话更新滚动条的位置
     */
    protected attachContent() {
        const begin = Math.max(0, this.excelBeginAttachedItem - 25);
        const end = Math.min(this.excelRowTotal, this.excelEndAttachedItem + 25);
        for (let i = 0; i < this.excelRows.length; i++) {
            if (i < begin || i > end) {
                this.excelRows[i].visible = false;
                continue;
            }
            this.excelRows[i].top = this.excelRowHeight * i;
            this.excelRows[i].visible = true;
        }
        this.renderer2.setStyle(this.excelBodyEl, 'height', this.excelAnchorScrollRunwayEnd + 'px');

        this.loadExcelRows().subscribe((success) => success && this.attachContent());
    }

    /**
     * 增加一个数据行
     */
    protected createExcelRow(): NgxExcelRow<T> {
        return { width: 0, height: 0, top: -1, primaryKey: '', context: null } as NgxExcelRow<T>;
    }

    /**
     * 创建或复用表单行的嵌入视图
     */
    /*protected createExcelRowEmbeddedView(): EmbeddedViewRef<NgxExcelRowTemplateContext<T>> {
        return this.excelRowTplRef.createEmbeddedView({ context: null });
    }*/

    /**
     * 根据源滚动瞄点和滚动偏移获得目标滚动描点
     * @param anchorItem 滚动之前的描点
     * @param delta 滚动偏移
     */
    protected calcAnchoredItem(anchorItem: NgxExcelAnchorItem, delta: number): NgxExcelAnchorItem {
        if (delta === 0) { return anchorItem; }
        delta += anchorItem.offset;
        let i = anchorItem.index, tombstones = 0;
        if (delta < 0) {
            while (delta < 0 && i > 0 && this.excelRows[i - 1].height) {
                delta += this.excelRows[i - 1].height;
                i--;
            }
            tombstones = Math.max(-i, Math.ceil(Math.min(delta, 0) / this.excelRowHeight));
        } else {
            while (delta > 0 && i < this.excelRows.length && this.excelRows[i].height && this.excelRows[i].height < delta) {
                delta -= this.excelRows[i].height;
                i++;
            }
            if (i >= this.excelRows.length || !this.excelRows[i].height) {
                tombstones = Math.floor(Math.max(delta, 0) / this.excelRowHeight);
            }
        }
        i += tombstones;
        delta -= tombstones * this.excelRowHeight;
        return { index: i, offset: delta };
    }

    /**
     * 加载数据行
     */
    protected loadExcelRows(): Observable<boolean> {
        if (
            (this.componentState === NgxExcelComponentState.Loading) ||                         // 正在加载过程中不会再次调用后端接口
            (this.componentState !== NgxExcelComponentState.Initial && !this.excelRowTotal) ||  // 服务器约定返回空列表则不会再次尝试拉取数据
            (this.excelRowTotal > 0 && this.excelRowLoadedCount >= this.excelRowTotal) ||       // 加载的数据行已经达到约定的行数不会再次调用后端接口
            (this.excelEndAttachedItem < this.excelRowLoadedCount - 1)                          // 尚未滚动到页面底部不会调用后端接口
        ) {
            return of(false);
        }

        let pageNum: number;
        const params = Object.assign({}, this.excelGlobalFilters);
        if (this.componentState === NgxExcelComponentState.Initial) {
            pageNum = this.excelPageNum = 1;
            params['meta'] = ['total', ...this.excelGlobalMetas].join(',');
            this.excelRowTotal = 0;
            this.excelRowLoadedCount = 0;
        } else {
            pageNum = this.excelPageNum + 1;
            this.componentState = NgxExcelComponentState.Loading;
        }

        return this.ngxExcelService.getListResponse(params, pageNum, this.excelPageSize).pipe(
            mergeMap((res: NgxExcelHttpResponse) => {
                if (this.componentState === NgxExcelComponentState.Initial) {
                    this.excelMetas = res.getMetas();
                    this.excelRowTotal = this.excelMetas['total'] || 0;
                    this.excelGlobalMetasSubject.next(this.excelMetas);
                }
                return this.ngxExcelService.getList(res);
            }),
            map((contexts: T[]) => {
                contexts.forEach((context) => {
                    if (this.excelRows.length >= this.excelRowTotal) {
                        // Excel的行数已经达到约定的记录数量则不再加载新的数据行
                        return;
                    }
                    if (this.excelRows.length <= this.excelRowLoadedCount) {
                        this.excelRows.push(this.createExcelRow());
                    }
                    const i = this.excelRowLoadedCount++;
                    this.excelRows[i].context = context;
                    this.excelRows[i].primaryKey = this.ngxExcelService.getPrimaryKey(context);
                    this.excelRows[i].visible = false;
                    this.excelRowsReflection[this.excelRows[i].primaryKey] = i;
                });
                this.componentState = NgxExcelComponentState.Normal;
                this.excelAnchorScrollRunwayEnd = this.excelRowLoadedCount * this.excelRowHeight;
                this.excelPageNum = pageNum;
                return true;
            }),
            catchError((err) => {
                this.getErrorHandles()(err);
                this.componentState = NgxExcelComponentState.Normal;
                return of(false);
            })
        );
    }

    /**
     * 恢复场景所需要的属性名列表
     */
    protected getCachedStageKeys(): string[] {
        return [
            'excelRows', 'excelRowsReflection', 'excelBeginAttachedItem', 'excelEndAttachedItem', 'excelComponentState',
            'excelPageNum', 'excelAnchorItem', 'excelScreenItem', 'excelRowTotal', 'excelRowLoadedCount',
            'excelAnchorScrollTop', 'excelAnchorScrollRunwayEnd', 'excelMetas'
            // 'selectedExcelCellComponent', 'selectedExcelColumn', 'selectedContext'
        ];
    }

    /**
     * 删除场景
     */
    protected clearStage() {
        if (!this.excelCacheEnabled) { return; }
        sessionStorage.removeItem(this.excelCacheKey);
    }

    /**
     * 恢复场景
     */
    protected restoreStage() {
        // 如果启用了缓存则从缓存中取出数据恢复场景
        if (!this.excelCacheEnabled) { return; }
        const cachedStageString = sessionStorage.getItem(this.excelCacheKey);
        if (!cachedStageString) { return; }
        const cachedStage = JSON.parse(cachedStageString);

        const cachedStageKeys = this.getCachedStageKeys();
        Object.keys(cachedStage).forEach((cachedStageKey) => {
            if (cachedStageKeys.indexOf(cachedStageKey) < 0) { return; }
            this[cachedStageKey] = cachedStage[cachedStageKey];
        });

        this.excelGlobalMetasSubject.next(this.excelMetas);
        this.clearStage();
        this.excelComponentState = NgxExcelComponentState.Restoring;
    }

    /**
     * 缓存场景
     */
    protected cacheStage() {
        // 如果启用了缓存并且当前不在初始化 / 加载中 / 恢复中状态则写入缓存数据
        if (!this.excelCacheEnabled ||
            this.excelComponentState === NgxExcelComponentState.Initial ||
            this.excelComponentState === NgxExcelComponentState.Loading ||
            this.excelComponentState === NgxExcelComponentState.Restoring
        ) { return; }

        const cachedStage = {};
        const cachedStageKeys = this.getCachedStageKeys();
        cachedStageKeys.forEach((cachedStageKey) => cachedStage[cachedStageKey] = this[cachedStageKey]);
        sessionStorage.setItem(this.excelCacheKey, JSON.stringify(cachedStage));
    }

    /**
     * 获得已配置的隐藏列
     */
    protected getInvisibleColumns(): string[] {
        if (!this.excelToggleColumnEnabled) { return []; }
        const cacheKey = this.excelCacheKey + 'InvisibleColumns';
        const invisibleColumnsJson = localStorage.getItem(cacheKey);
        return JSON.parse(invisibleColumnsJson || '[]');
    }

    /**
     * 保存隐藏列配置
     */
    protected cacheInvisibleColumns() {
        if (!this.excelToggleColumnEnabled) { return; }
        const cacheKey = this.excelCacheKey + 'InvisibleColumns';
        const invisibleColumnsJson = JSON.stringify(this.excelInvisibleColumns);
        localStorage.setItem(cacheKey, invisibleColumnsJson);
    }

}
