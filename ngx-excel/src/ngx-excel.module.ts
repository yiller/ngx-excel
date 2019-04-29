import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material';
import { NgSelectModule } from '@ng-select/ng-select';
import { ContextMenuModule } from 'ngx-contextmenu';
import { TextMaskModule } from 'angular2-text-mask';

import { NgxExcelSelectOptionPipe } from './pipes/ngx-excel-select-option.pipe';
import { NgxExcelDateTimePipe } from './pipes/ngx-excel-datetime.pipe';
import { NgxExcelCurrencyPipe } from './pipes/ngx-excel-currency.pipe';

import { NgxExcelComponent } from './ngx-excel.component';
import { NgxExcelColumnComponent } from './components/ngx-excel-column.component';
import { NgxExcelContextActionComponent } from './components/ngx-excel-context-action.component';
import { NgxExcelContextComponent } from './components/ngx-excel-context.component';
import { NgxExcelCellComponent } from './components/ngx-excel-cell.component';
import { NgxExcelHeadCellComponent } from './components/ngx-excel-head-cell.component';
import { NgxExcelHandleCellComponent } from './components/ngx-excel-handle-cell.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatTooltipModule,
        NgSelectModule,
        ContextMenuModule,
        TextMaskModule
    ],
    exports: [
        NgxExcelComponent,
        NgxExcelColumnComponent,
        NgxExcelContextActionComponent,

        NgxExcelContextComponent,

        NgxExcelCellComponent,
        NgxExcelHeadCellComponent,
        NgxExcelHandleCellComponent,

        NgxExcelSelectOptionPipe,
        NgxExcelDateTimePipe,
        NgxExcelCurrencyPipe
    ],
    declarations: [
        NgxExcelComponent,
        NgxExcelColumnComponent,
        NgxExcelContextActionComponent,

        NgxExcelContextComponent,

        NgxExcelCellComponent,
        NgxExcelHeadCellComponent,
        NgxExcelHandleCellComponent,

        NgxExcelSelectOptionPipe,
        NgxExcelDateTimePipe,
        NgxExcelCurrencyPipe
    ],
    providers: []
})
export class NgxExcelModule { }
