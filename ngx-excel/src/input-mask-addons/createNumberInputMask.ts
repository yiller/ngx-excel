import { TextMaskConfig } from 'angular2-text-mask';

export default function createNumberInputMask({ min = '', max = '', preZero = false } = {}) {
    const inputMask: TextMaskConfig = { mask: [], placeholderChar: '\u2000' };
    inputMask.mask = (rawValue: string) => {
        if (!rawValue || rawValue.length === 0) {
            return [/\d/];
        }

        rawValue = rawValue.replace(/\D+/g, '');
        if (!preZero) {
            rawValue = rawValue.replace(/^0+(0$|[^0])/, '$1');
        }

        return rawValue.split('').map((char) => /\d/.test(char) ? /\d/ : char);
    };

    if (!preZero && (min.length > 0 || max.length > 0)) {
        inputMask.pipe = (conformedValue: string) => {
            const indexesOfPipedChars = [];
            const value = parseInt(conformedValue, 10);
            if (min.length > 0 && max.length > 0) {
                const scopedMinValue = parseInt(min, 10);
                const scopedMaxValue = parseInt(max, 10);
                if (value < scopedMinValue || value > scopedMaxValue) { return false; }
            } else if (min.length > 0) {
                const scopedMinValue = parseInt(min, 10);
                if (value < scopedMinValue) { return false; }
            } else if (max.length > 0) {
                const scopedMaxValue = parseInt(max, 10);
                if (value > scopedMaxValue) { return false; }
            }

            return {
                value: conformedValue,
                indexesOfPipedChars
            };

        };
    }

    return inputMask;
}
