import { Pipe, PipeTransform } from '@angular/core';
import { parseZone } from 'moment';

@Pipe({
    name: 'ngxExcelDateTime'
})
export class NgxExcelDateTimePipe implements PipeTransform {

    /**
     * 格式化显示日期
     * @param `string` value 日期字符串
     * @param `string` format 格式 date / time / datetime
     * @return `string`
     */
    transform(value: string, format?: string): any {
        let formatedString = '';
        switch (format) {
            case 'time':
                formatedString = this.transformTime(value);
                break;
            case 'date':
                formatedString = this.transformDate(value);
                break;
            default:
                formatedString = this.transformDateTime(value);
        }
        return formatedString.length === 0 ? '格式错误' : formatedString;
    }

    protected transformTime(value: string) {
        if (!value) { return ''; }
        const m = parseZone('2000-01-01 ' + value);
        return m.isValid() ? m.format('HH:mm') : '';
    }

    protected transformDate(value) {
        if (!value) { return ''; }
        const m = parseZone(value);
        return m.isValid() ? m.format('YYYY-MM-DD') : '';
    }

    protected transformDateTime(value) {
        if (!value) { return ''; }
        const m = parseZone(value);
        return m.isValid() ? m.format('YYYY-MM-DD HH:mm') : '';
    }
}
