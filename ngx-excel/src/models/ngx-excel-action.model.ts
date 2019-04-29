import { NgxExcelCellEvent } from './ngx-excel-cell.model';
import { Observable } from 'rxjs';

export enum NgxExcelActionScope {
    Excel   = 'excel',
    Context = 'context',
    Column  = 'column'
}

export interface NgxExcelAction<T> {
    label:          string;
    action:         string;
    icon:           string;
    prefix:         boolean;
    actionScope:    NgxExcelActionScope;
    disabled:       boolean;
    invisible:      boolean;
    enabled?:       (payload: NgxExcelCellEvent<T>) => boolean;
    visible?:       (payload: NgxExcelCellEvent<T>) => boolean;
    execute?:       (payload: NgxExcelContextMenuClickedEvent<T>) => Observable<NgxExcelContextChanged<T>[]> | void;
}

export interface NgxExcelContextMenuClickedEvent<T> extends NgxExcelCellEvent<T> {
    action: NgxExcelAction<T>;
}

export interface NgxExcelContextChanged<T> {
    action: 'append' | 'prepend' | 'destoryed' | 'updated';
    context?: T;
    contexts?: T[];
    relativedContext?: T;
}

export enum NgxExcelContextToggleState {
    Collapse    = 'collapse',
    Expand      = 'expand'
}

export interface NgxExcelContextToggledEvent<T> extends NgxExcelCellEvent<T> {
    previousState:  NgxExcelContextToggleState;
    currentState:   NgxExcelContextToggleState;
}
