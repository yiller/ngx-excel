import { TemplateRef } from '@angular/core';
import { NgxExcelSelectOption } from './ngx-excel-common.model';
import { NgxExcelColumnType } from './ngx-excel.enum';
import { NgxExcelService } from '../services/ngx-excel.service';
import { NgxExcelRowTemplateContext } from './ngx-excel-row.model';

export interface TagsSelectOption {
    label:          string;
    tag:            boolean;
}

export interface NgxExcelColumnTemplateContext<T> extends NgxExcelRowTemplateContext<T> {
    column:         NgxExcelColumn<T>;
}

export interface NgxExcelColumn<T> {
    name:               string;
    label:              string;
    width:              number;
    computedWidth:      number;
    computedOffset:     number;

    locked:             boolean;
    readonly:           boolean | ((context: T) => boolean);
    invisible:          boolean;
    sortable:           boolean;

    columnType:         NgxExcelColumnType;
    allowNegative:      boolean;
    // selectOptions:  NgxExcelSelectOption[] | NgxExcelService<any>;
    selectOptions:      NgxExcelSelectOption[];
    relativeService:    NgxExcelService<any>;
    labelKey:           string;
    typeaheadKey:       string;

    templateHead:       TemplateRef<NgxExcelColumnTemplateContext<T>>;
    templateEdit:       TemplateRef<NgxExcelColumnTemplateContext<T>>;
    template:           TemplateRef<NgxExcelColumnTemplateContext<T>>;
}
