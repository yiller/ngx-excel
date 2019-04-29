import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ngxExcelCurrency'
})

export class NgxExcelCurrencyPipe implements PipeTransform {

    /**
     * 格式化显示金额
     * @param value 字符型金额
     * @param places 小数位数
     * @param decimal 小数点符号
     * @param thousand 千位分隔符
     * @param symbol 货币符号
     */
    transform(value: string, places?: number, decimal?: string, thousand?: string, symbol?: string): string {
        places = !isNaN(places = Math.abs(places)) ? places : 2;
        symbol = symbol || '';
        thousand = thousand || '';
        decimal = decimal || '.';
        const number = Math.abs(/^(-)?\d+(\.\d+)?$/.test(value) ? parseFloat(value) : 0).toFixed(places);
        const negative = parseInt(value, 10) < 0 ? '-' : '',
            i = parseInt(number, 10) + '';
        let j = i.length;
        j = j > 3 ? j % 3 : 0;
        return symbol + negative + (j ? i.substr(0, j) + thousand : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + thousand) + (places ? decimal + Math.abs(parseFloat(number) - parseInt(i, 10)).toFixed(places).slice(2) : '');
    }
}
