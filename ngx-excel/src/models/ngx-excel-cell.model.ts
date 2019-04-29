import { NgxExcelColumn } from './ngx-excel-column.model';

export interface NgxExcelCellEvent<T> {
    column: NgxExcelColumn<T>;
    context: T;
}

export type NgxExcelCellSelectedEvent<T> = NgxExcelCellEvent<T>;
export type NgxExcelCellDoubleClickedEvent<T> = NgxExcelCellEvent<T>;
export type NgxExcelCellComponentValueChangedEvent<T> = NgxExcelCellEvent<T>;

