import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxExcelService, NgxExcelSelectOption, NgxExcelColumnType } from 'ngx-excel';
import { BuilderService } from './builder';

export interface Person {
    id:         string;
    name:       string;
    gender:     NgxExcelSelectOption;
    age:        number;
    birthday:   string;
    remark:     string;
}

@Injectable()
export class PersonService extends NgxExcelService<Person> {

    protected cacheable     = true;
    protected cached        = true;
    protected resourceUri   = '';
    protected resourceName  = 'person';
    protected rules         = {
        id:         { label: '主键', columnType: NgxExcelColumnType.PrimaryKey },
        name:       { label: '姓名', columnType: NgxExcelColumnType.Text },
        gender:     { label: '性别', columnType: NgxExcelColumnType.SelectOption, selectOptions: this.getSelectOptions('PERSON_GENDER') },
        age:        { label: '年龄', columnType: NgxExcelColumnType.Number },
        birthday:   { label: '出生年月', columnType: NgxExcelColumnType.Date },
        remark:     { label: '备注', columnType: NgxExcelColumnType.MultilineText }
    };

    constructor(
        protected httpClient: HttpClient,
        protected builderService: BuilderService
    ) {
        super(httpClient, builderService);
    }
}
