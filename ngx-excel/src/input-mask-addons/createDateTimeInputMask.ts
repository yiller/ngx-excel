import { TextMaskConfig } from 'angular2-text-mask';

const maxValueMonth = [31, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const formatOrder = ['YYYY', 'YY', 'MM', 'DD', 'HH', 'mm', 'ss'];
export default function createDateTimeInputMask(dateTimeFormat = 'YYYY-MM-DD HH:mm:ss', { min = '', max = '' } = {}) {
    const inputMask: TextMaskConfig = { mask: [], placeholderChar: '\u2000', keepCharPositions: true };
    inputMask.mask = dateTimeFormat.split('').map((char) => /[YMDHms]/.test(char) ? /\d/ : char);

    const dateTimeFormatArray = dateTimeFormat.split(/[^YMDHms]+/).sort((a, b) => formatOrder.indexOf(a) - formatOrder.indexOf(b));
    inputMask.pipe = (conformedValue: string) => {
        const indexesOfPipedChars = [];
        const maxValue = { 'DD': 31, 'MM': 12, 'YY': 99, 'YYYY': 9999, 'HH': 23, 'mm': 59, 'ss': 59 };
        const minValue = { 'DD': 1, 'MM': 1, 'YY': 0, 'YYYY': 1900, 'HH': 0, 'mm': 0, 'ss': 0 };
        const conformedValueArr = conformedValue.split('');

        // Check first digit
        dateTimeFormatArray.forEach((format) => {
            const position = dateTimeFormat.indexOf(format);
            const maxFirstDigit = parseInt(maxValue[format].toString().substr(0, 1), 10);

            if (parseInt(conformedValueArr[position], 10) > maxFirstDigit) {
                conformedValueArr[position + 1] = conformedValueArr[position];
                conformedValueArr[position] = '0';
                indexesOfPipedChars.push(position);
            }
        });

        // Check for invalid date
        let month = 0;
        const isInvalid = dateTimeFormatArray.some((format) => {
            const position = dateTimeFormat.indexOf(format);
            const length = format.length;
            const textValue = conformedValue.substr(position, length).replace(/\D/g, '');
            const value = parseInt(textValue, 10);
            if (format === 'MM') {
                month = value || 0;
            }
            const maxValueForFormat = format === 'DD' ? maxValueMonth[month] : maxValue[format];
            if (format === 'YYYY') {
                const scopedMaxValue = parseInt(maxValue[format].toString().substring(0, textValue.length), 10);
                const scopedMinValue = parseInt(minValue[format].toString().substring(0, textValue.length), 10);
                return value < scopedMinValue || value > scopedMaxValue;
            }
            return value > maxValueForFormat || (textValue.length === length && value < minValue[format]);
        });

        if (isInvalid) { return false; }

        conformedValue = conformedValueArr.join('');
        if (min.length > 0 && max.length > 0) {
            const scopedMaxConformedValue = max.substr(0, conformedValueArr.length);
            const scopedMinConformedValue = min.substr(0, conformedValueArr.length);
            if (conformedValue < scopedMinConformedValue || conformedValue > scopedMaxConformedValue) { return false; }
        } else if (min.length > 0) {
            const scopedMinConformedValue = min.substr(0, conformedValueArr.length);
            if (conformedValue < scopedMinConformedValue) { return false; }
        } else if (max.length > 0) {
            const scopedMaxConformedValue = max.substr(0, conformedValueArr.length);
            if (conformedValue > scopedMaxConformedValue) { return false; }
        }

        return {
            value: conformedValue,
            indexesOfPipedChars
        };
    };


    return inputMask;
}
