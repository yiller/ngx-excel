import { Input, OnChanges, ElementRef, Renderer2, SimpleChanges, Optional, Inject } from '@angular/core';
import { NgSelectConfig } from '@ng-select/ng-select';
import { ContextMenuService } from 'ngx-contextmenu';
import { pascalCase } from 'change-case';
import { NgxExcelColumn } from '../models';
import { NgxExcelService } from '../services/ngx-excel.service';
import { NgxExcelComponentRef, NgxExcelComponent } from '../ngx-excel.component';


export abstract class NgxExcelCellContract<T> implements OnChanges {

    @Input() column: NgxExcelColumn<T>;

    constructor(
        protected el: ElementRef,
        protected renderer2: Renderer2,
        protected ngSelectConfig: NgSelectConfig,
        protected contextMenuService: ContextMenuService,
        protected ngxExcelService: NgxExcelService<T>,
        @Optional() @Inject(NgxExcelComponentRef) protected excelComponentRef: NgxExcelComponent<T>
    ) {
        this.ngSelectConfig.addTagText = '增加新项';
        this.ngSelectConfig.clearAllText = '清除全部';
        this.ngSelectConfig.loadingText = '数据交互中，请稍候...';
        this.ngSelectConfig.notFoundText = '没有找到待选项';
        this.ngSelectConfig.placeholder = '-- 请选择 --';
        this.ngSelectConfig.typeToSearchText = '搜索...';
    }

    ngOnChanges(changes: SimpleChanges) {
        Object.keys(changes).forEach((name: string) => {
            if (this['on' + pascalCase(name) + 'Changed']) {
                this['on' + pascalCase(name) + 'Changed']();
            }
        });
    }
}
