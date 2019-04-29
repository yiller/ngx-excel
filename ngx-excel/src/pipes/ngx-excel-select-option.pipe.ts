import { Pipe, PipeTransform } from '@angular/core';
import { NgxExcelSelectOption } from '../models';

@Pipe({
    name: 'ngxExcelSelectOption'
})

export class NgxExcelSelectOptionPipe implements PipeTransform {

    /**
     * 显示选项或选项列表
     * @param value SelectOption 对象或对象列表
     * @param count 最多渲染的对象数量
     */
    transform(value: NgxExcelSelectOption | NgxExcelSelectOption[], count?: number): string {
        if (!Array.isArray(value)) {
            value = [ value ];
        }
        return value.slice(0, count || value.length).map((item: NgxExcelSelectOption) => item.label).join('，');
    }
}
