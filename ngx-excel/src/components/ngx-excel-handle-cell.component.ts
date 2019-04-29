import { Component, OnInit } from '@angular/core';
import { NgxExcelCellContract } from './ngx-excel-cell.contract';

@Component({
    selector: 'ngx-excel-cell[handleCell]',
    template: '<div class="handle"></div>'
})
export class NgxExcelHandleCellComponent<T> extends NgxExcelCellContract<T> implements OnInit {

    ngOnInit() { }

}
