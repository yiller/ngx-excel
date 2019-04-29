import { TextMaskConfig } from 'angular2-text-mask';

export default function createCurrencyInputMask() {
    const inputMask: TextMaskConfig = { mask: [], placeholderChar: '\u2000' };

    inputMask.mask = (rawValue: string) => {
        if (!rawValue || rawValue.length === 0) {
            return [/\d/];
        }

        if (rawValue === '.') {
            return ['0', '.', /\d/];
        }

        const decimalPos = rawValue.lastIndexOf('.');
        let integer: string, decimal: string;
        if (decimalPos >= 0) {
            integer = rawValue.slice(0, decimalPos).replace(/\D+/g, '');
            decimal = rawValue.slice(decimalPos + 1, rawValue.length).replace(/\D+/g, '').substr(0, 2);
        } else {
            integer = rawValue.replace(/\D+/g, '');
            decimal = '';
        }

        const mask = integer.replace(/^0+(0$|[^0])/, '$1').split('').map((char) => /\d/.test(char) ? /\d/ : char);
        if (decimalPos >= 0) {
            mask.push('.');
            mask.push(...decimal.split('').map((char) => /\d/.test(char) ? /\d/ : char));
        }

        return mask;
    };

    return inputMask;
}
