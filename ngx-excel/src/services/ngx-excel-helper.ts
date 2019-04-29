import { NgxExcelSelectOption } from '../models';

export abstract class NgxExcelHelper {

    protected selectGroups: { [name: string]: NgxExcelSelectOption[] } = {};

    public getSelectOptions(name: string): NgxExcelSelectOption[] {
        return this.selectGroups[name] || [];
    }

}
