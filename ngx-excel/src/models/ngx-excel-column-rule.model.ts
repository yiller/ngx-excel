import { NgxExcelSelectOption } from './ngx-excel-common.model';
import { NgxExcelColumnType } from './ngx-excel.enum';
import { NgxExcelService } from '../services/ngx-excel.service';

export interface NgxExcelModelColumnRule<T> {
    label:              string;
    columnType:         NgxExcelColumnType;
    allowNegative?:     boolean;
    selectOptions?:     NgxExcelSelectOption[];
    relativeService?:   NgxExcelService<any>;
    labelKey?:          string;
    typeaheadKey?:      string;
    prop?:              string | string[];
    default?:           any;
    resolveValue?:      (o: any, context?: Partial<T>) => any;
    resolveKey?:        (name: string) => string;
}
