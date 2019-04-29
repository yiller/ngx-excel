import { EmbeddedViewRef } from '@angular/core';

export interface NgxExcelRowTemplateContext<T> {
    context: T;
}

export interface NgxExcelRow<T> {
    width:          number;
    height:         number;
    top:            number;
    primaryKey:     string;
    context:        T;
    visible:        boolean;
}
