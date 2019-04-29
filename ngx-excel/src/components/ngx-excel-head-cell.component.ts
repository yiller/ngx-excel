import { Component, OnInit, Input, TemplateRef } from '@angular/core';
import { NgxExcelCellContract } from './ngx-excel-cell.contract';

@Component({
    selector: 'ngx-excel-cell[headCell]',
    template: `
        <div class="cell" [class.cell-tooltip]="tooltip" container="body" [matTooltip]="tooltip">
            {{ column.label }}
            <i *ngIf="tooltip" class="fa fa-question-circle"></i>
        </div>`
})

export class NgxExcelHeadCellComponent<T> extends NgxExcelCellContract<T> implements OnInit {

    @Input() tooltip: string;

    ngOnInit() { }

}
