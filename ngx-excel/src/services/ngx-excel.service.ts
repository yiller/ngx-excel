import { HttpClient } from '@angular/common/http';
import { NgxExcelModelColumnRule, NgxExcelContextChanged, NgxExcelSelectOption, NgxExcelHttpResponse, NgxExcelColumnType } from '../models';
import { NgxExcelHelper } from './ngx-excel-helper';
import { Observable, of, throwError } from 'rxjs';
import { map, delay, mergeMap, tap, catchError } from 'rxjs/operators';
import { snakeCase, pascalCase } from 'change-case';
import { utc } from 'moment';
import * as _ from 'lodash';

export abstract class NgxExcelService<T> {

    protected abstract rules: { [name in keyof T]: NgxExcelModelColumnRule<T> };
    protected additionalRules: { [name in keyof T]?: NgxExcelModelColumnRule<T> };
    protected globalFilters: { [param: string]: string | string[] } = {};
    protected abstract resourceUri: string;
    protected abstract resourceName: string;
    protected resourceUriParams: { [param: string]: string } = {};
    protected manualFilterKeys: string[] = [];
    protected autoCommitKeys: Array<keyof T> = [];
    protected cached = false;                               // 判断是否已缓存数据
    protected cacheable = false;                            // 是否可被缓存
    protected cachedMetas: { [name: string]: any } = {};    // 已被缓存的元数据
    protected cachedModels: { [name: string]: T } = {};     // 已被缓存的数据模型

    constructor(
        protected httpClient: HttpClient,
        protected helper: NgxExcelHelper
    ) { }

    /**
     * 判断是否有针对该模型的指定操作权限
     * @param model 待处理的模型
     * @param action 处理动作
     */
    public privilege(model: T, action: string): boolean {
        return true;
    }

    /**
     * 判断是否有针对该模型的指定操作能力
     * @param model 待处理的模型
     * @param action 处理动作
     */
    public can(model: T, action: string): boolean {
        return true;
    }

    /**
     * 获得所有字段的模型规则
     */
    public getRules(): { [name in keyof T]: NgxExcelModelColumnRule<T> } {
        return _.each(
            _.merge(this.rules, this.additionalRules),
            (rule, ruleKey) => _.set(rule, 'name', rule['name'] || ruleKey)
        );
    }

    /**
     * 获得指定字段的模型规则
     * @param `string` name
     * @return `NgxExcelModelColumnRule<T>`
     */
    public getRule(name: string): NgxExcelModelColumnRule<T> {
        return _.get(this.getRules(), name, null);
    }

    /**
     * 获得模型主键
     * @param `T` model
     * @return `string`
     */
    public getPrimaryKey(model: T): string {
        return _.findKey(this.getRules(), ['columnType', NgxExcelColumnType.PrimaryKey]) || '';
    }

    /**
     * 创建模型
     * @param attributes 待转化的模型属性值
     * @param o 服务器返回的字段列表
     */
    public createModel(attributes?: Partial<T>, o?: any): T {
        const model = o ? this.resolve(o) : this.getDefaultModel();
        return (attributes ? _.merge(model, attributes) : model) as T;
    }

    /**
     * 清除缓存
     */
    public clearCaches() {
        if (!this.cacheable) { return; }
        this.cached = false;
        this.cachedModels = {};
        this.cachedMetas = {};
    }

    /**
     * 绑定资源URI中的路由参数
     * @param params 参数列表
     */
    public bindUriParams(params: { [param: string]: string }): NgxExcelService<T> {
        this.resourceUriParams = params;
        return this;
    }

    /**
     * 绑定全局的过滤参数
     * @param `{ [param: string]: string | string[] }` filters
     * @return `NgxExcelService<T>`
     */
    public buildGlobalFilters(filters: { [param: string]: string | string[] }): NgxExcelService<T> {
        _.merge(this.globalFilters, filters);
        // Object.assign(this.globalFilters, filters);
        return this;
    }

    /**
     * 获得模型列表的资源响应
     * @param filters 请求列表筛选参数
     * @param page 页码
     * @param pageSize 页面长度
     */
    public getListResponse(filters?: { [param: string]: string | string[] }, page?: number, pageSize?: number): Observable<NgxExcelHttpResponse> {
        if (this.cached) {
            const res = new NgxExcelHttpResponse(null);
            _.forIn(this.cachedMetas, (cachedMeta, cachedMetaKey) => res.setMeta(cachedMetaKey, cachedMeta));
            const models = _.filter(this.cachedModels, (cachedModel) => this.isMatched(cachedModel, filters));
            // 延迟 200 毫秒，因为可能引起组件的脏检测
            return of(res.setMeta('total', models.length).setCollection<T>(this.resourceName, models)).pipe(delay(200));
        }

        const resourceUri = this.getResourceUri();
        if (resourceUri.length === 0) {
            return null;
        }

        let cacheIsAvailable = this.cacheable;
        const originalParams = _.clone(this.globalFilters) as { [name: string]: any };
        if (page && pageSize) {
            // 分页获得数据不需要从本地缓存中获取
            originalParams['page'] = page.toString();
            originalParams['pageSize'] = pageSize.toString();
            cacheIsAvailable = false;
        } else {
            originalParams['loadCollection'] = 'true';
        }

        if (filters) {
            const filterParams = _.pick(filters, _.difference(_.keys(filters), this.manualFilterKeys));
            _.merge(originalParams, filterParams);
            /*Object.keys(filters).forEach((filterKey) => {
                if (filterKey !== 'meta' && this.manualFilterKeys.indexOf(filterKey) >= 0) { return; }
                originalParams[filterKey] = filters[filterKey];
            });*/
        }

        const params: { [name: string]: string | string[] } = {};
        _.forIn(originalParams, (paramValue, paramKey) => {
            paramKey = snakeCase(paramKey);
            if (_.isArray(paramValue)) {
                paramKey += '[]';
                params[paramKey] = paramValue;
            } else if (_.isPlainObject(paramValue)) {
                _.forIn(paramValue, (objectValue, objectKey) => params[paramKey + '[' + objectKey + ']'] = objectValue);
            } else {
                params[paramKey] = paramValue;
            }
        });

        return this.httpClient.get<NgxExcelHttpResponse>(resourceUri, { params: params }).pipe(
            mergeMap((res) => {
                if (cacheIsAvailable) {
                    this.clearCaches();
                    this.cachedMetas = res.getMetas();
                    _.each(res.getCollection<T>(this.resourceName, (o) => this.resolve(o)), (model) => this.cache(model));
                    this.cached = true;
                    return this.getListResponse(filters, page, pageSize);
                } else {
                    if (this.cacheable) {
                        _.each(res.getCollection<T>(this.resourceName, (o) => this.resolve(o)), (model) => this.cache(model));
                    }
                    return of(res);
                }
            })
        );
    }

    /**
     * 获得模型列表
     * @param response 列表筛选参数或服务器响应对象
     * @param page 请求页码(页码和数量同时为空时代表返回全部数据)
     * @param length 请求数量
     */
    public getList(response?: NgxExcelHttpResponse | { [param: string]: string | string[] }, page?: number, pageSize?: number): Observable<T[]> {
        const obs = response instanceof NgxExcelHttpResponse ? of(response) : this.getListResponse(response, page, pageSize);

        if (!obs) {
            return of([]);
        }

        return obs.pipe(
            map((res: NgxExcelHttpResponse) => res.getCollection<T>(this.resourceName, (o) => this.resolve(o)))
        );
    }

    /**
     * 获得模型实例的资源响应
     * @param primaryKey 模型主键
     */
    public getModelResponse(primaryKey: string): Observable<NgxExcelHttpResponse> {
        const resourceUri = this.getResourceUri();
        if (resourceUri.length === 0) {
            return null;
        }

        return this.httpClient.get<NgxExcelHttpResponse>(resourceUri + '/' + primaryKey).pipe(
            map((res) => {
                if (!this.cacheable) { return res; }
                const model = res.getModel<T>((o) => this.resolve(o));
                if (!model) { return res; }
                this.cache(model);
                // 确保从 Service 传出的只能是 cachedModels 的副本以便未来的脏检测机制
                return new NgxExcelHttpResponse(null).setModel(Object.assign({}, model));
            })
        );
    }

    /**
     * 获得模型实例（始终从服务器获得并缓存）
     * @param response 模型主键或服务器响应对象
     */
    public getModel(response: NgxExcelHttpResponse | string): Observable<T> {
        const obs = response instanceof NgxExcelHttpResponse ? of(response) : this.getModelResponse(response);

        if (!obs) {
            return of(null);
        }

        return obs.pipe(
            map((res: NgxExcelHttpResponse) => res.getModel<T>((o) => this.resolve(o)))
        );
    }

    /**
     * 获得模型实例（优先缓存获得）
     * @param primaryKey 模型主键
     */
    public find(primaryKey: string): Observable<T> {
        return of(_.get(this.cachedModels, primaryKey, null)).pipe(
            mergeMap((model) => model ? of(model) : this.getModel(primaryKey))
        );
    }

    /**
     * 更新或创建实例模型
     * @param data 请求参数或模型对象
     * @param primaryKey 模型主键(如提供主键代表更新模型, 否则创建模型)
     */
    public save(data: { [name: string]: any }, primaryKey?: string): Observable<T> {
        const resourceUri = this.getResourceUri(primaryKey);
        const method = primaryKey ? 'patch' : 'post';
        const body = this.resolveBody(data);
        return this.httpClient[method](resourceUri, body).pipe(
            map((res: NgxExcelHttpResponse) => {
                const model = res.getModel<T>((o) => this.resolve(o));
                if (!model) { return null; }
                if (this.cacheable) { _.set(this.cachedModels, this.getPrimaryKey(model), model); }
                return model;
            })
        );
    }

    /**
     * 删除模型
     * @param model 模型或模型主键
     * @param params 删除时可传递参数
     */
    public destroy(model: T | string, params?: { [name: string]: string | string[] }): Observable<T> {
        const primaryKey = typeof (model) === 'string' ? model : this.getPrimaryKey(model);
        if (!primaryKey) { return of(null); }
        const resourceUri = this.getResourceUri(primaryKey);
        if (!resourceUri) { return of(null); }

        return this.httpClient.delete(resourceUri, { params: params }).pipe(
            map((res: NgxExcelHttpResponse) => {
                const removedModel = res.getModel<T>((o) => this.resolve(o));
                if (!removedModel) { return null; }
                if (this.cacheable) { _.unset(this.cachedModels, this.getPrimaryKey(removedModel)); }
                return removedModel;
            })
        );
    }

    /**
     * 删除模型(别名)
     * @param model 模型或模型主键
     * @param params 删除时可传递参数
     */
    public remove(model: T | string, params?: { [name: string]: string | string[] }): Observable<T> {
        return this.destroy(model, params);
    }

    /**
     * 批量增加
     * @param data 批量增加时需要传递的参数
     * @param clearCache 是否清除缓存(缺省 `false`)
     */
    public batchSave(data: { [name: string]: any }, clearCache = false): Observable<T[]> {
        const resourceUri = this.getResourceUri();
        if (!resourceUri) { return of([]); }
        const body = this.resolveBody(_.merge({}, data || {}, this.globalFilters));
        return this.httpClient.post(resourceUri, body).pipe(
            map((res: NgxExcelHttpResponse) => res.getCollection<T>(this.resourceName, (o) => this.resolve(o))),
            tap((models) => {
                if (!this.cacheable) { return; }
                if (clearCache) { this.cachedModels = {}; }
                _.each(models, (model) => this.cache(model));
            })
        );
    }

    /**
     * 批量更新
     * @param data 批量更新时需要传递的参数
     */
    public batchUpdate(data: { [name: string]: any }): Observable<T[]> {
        const resourceUri = this.getResourceUri();
        if (!resourceUri) { return of(null); }
        const body = this.resolveBody(_.merge({}, data || {}, this.globalFilters));
        return this.httpClient.patch(resourceUri, body).pipe(
            map((res: NgxExcelHttpResponse) => res.getCollection<T>(this.resourceName, (o) => this.resolve(o))),
            tap((models) => {
                if (!this.cacheable) { return; }
                _.each(models, (model) => this.cache(model));
            })
        );
    }

    /**
     * 批量删除
     * @param data 批量参数时需要传递的参数
     */
    public batchDestroy(data?: { [name: string]: any }): Observable<T[]> {
        const resourceUri = this.getResourceUri();
        if (!resourceUri) { return of([]); }
        const body = this.resolveBody(_.merge({}, data || {}, this.globalFilters));
        return this.httpClient.delete(resourceUri, { params: body }).pipe(
            map((res: NgxExcelHttpResponse) => res.getCollection<T>(this.resourceName, (o) => this.resolve(o))),
            tap((models) => {
                if (!this.cacheable) { return; }
                _.each(models, (model) => _.unset(this.cachedModels, this.getPrimaryKey(model)));
            })
        );
    }

    /**
     * 批量删除(别名)
     * @param data 批量参数时需要传递的参数
     */
    public batchRemove(data?: { [name: string]: any }): Observable<T[]> {
        return this.batchDestroy(data);
    }

    /**
     * 处理模型变更
     * @param originalModel 原始的模型
     * @param model 更改后的模型
     * @param name 更改的字段名
     */
    public handleModelChanged(originalModel: T, model: T, name: string): Observable<NgxExcelContextChanged<T>[]> {
        const primaryKey = this.getPrimaryKey(model);
        /*let cachedModel: T;
        let forceUpdate = true;
        if (!primaryKey || !this.cacheable) {
            cachedModel = Object.assign({}, model);
        } else if (this.cacheable && this.cachedModels[primaryKey]) {
            cachedModel = this.cachedModels[primaryKey];
            forceUpdate = false;
        } else {
            cachedModel = Object.assign({}, model);
        }

        // const cachedModel = this.cacheable ? this.cachedModels[primaryKey] : Object.assign({}, model);
        if (!cachedModel) { return throwError({ message: '系统错误，请联系管理员' }); }*/

        // 定义了 handleNameChanged 则直接调用方法返回
        const method = 'handle' + pascalCase(name) + 'Changed';
        if (!_.isUndefined(this[method])) { return _.invoke(this, method, originalModel, model, name); }
        // if (typeof (this[method]) !== 'undefined') { return this[method](cachedModel, model, name); }

        // 如果没有定义 修改白名单 (autoCommitKeys) 或 值没有发生变化 则不用提交更新
        if (_.indexOf(this.autoCommitKeys, (<keyof T>name)) < 0 || originalModel[name] === model[name]) {
            return of([{ action: 'updated', context: _.clone(model) }] as NgxExcelContextChanged<T>[]);
            // return throwError({ message: '系统错误，尝试修改不允许的值' });
        }

        // 只提交允许自动更新的值
        return this.save(_.pick(model, this.autoCommitKeys), primaryKey).pipe(
            map((updatedModel: T) => [{ action: 'updated', context: _.clone(updatedModel) }] as NgxExcelContextChanged<T>[]),
            catchError((err) => {
                return throwError({
                    message: err.message || err,
                    original: [{ action: 'updated', context: _.clone(originalModel) }]
                });
            })
        );
    }

    /**
     * 根据 name 获得选项列表
     * @param name 枚举标识
     */
    protected getSelectOptions(name: string): NgxExcelSelectOption[] {
        return this.helper.getSelectOptions(name);
        /*if (this.selectGroups.has(name)) {
            return this.selectGroups.get(name);
        }

        const selectGroup = this.builderService.getSelectGroups([name]).find((group) => group.name === name);
        const selectOptions = (selectGroup ? selectGroup.options : []).map((option) => {
            option.value = typeof (option.value) === 'number' ? option.value.toString() : option.value;
            return option;
        });
        this.selectGroups.set(name, selectOptions);
        return selectOptions;*/
    }

    /**
     * 获得实际的资源URI
     * @param primaryKey 模型主键(不传递返回资源集合URI否则返回资源详情URI)
     */
    protected getResourceUri(primaryKey?: string): string {
        let resourceUri = this.resourceUri;
        _.forIn(this.resourceUriParams, (paramValue, paramKey) => {
            if (_.indexOf(resourceUri, '{' + paramKey + '}') >= 0) {
                resourceUri = _.replace(resourceUri, '{' + paramKey + '}', paramValue);
            } else if (_.indexOf(resourceUri, '{' + snakeCase(paramKey) + '}') >= 0) {
                resourceUri = _.replace(resourceUri + '{' + snakeCase(paramKey) + '}', paramValue);
            } else {
                _.set(this.globalFilters, paramKey, paramValue);
            }
        });

        if (_.indexOf(resourceUri, '{') >= 0) {
            return '';
        }

        return primaryKey ?
            (_.endsWith(resourceUri, '/') ? (resourceUri + primaryKey) : (resourceUri + '/' + primaryKey)) :
            resourceUri;
    }

    /**
     * 将服务器响应转化为对应的模型
     * @param o 服务器返回的消息对象
     */
    protected resolve(o: any): T {
        const model = {};
        _.each(this.getRules(), (rule, name) => {
            model[name] = null;
            if (rule.resolveValue) {
                model[name] = rule.resolveValue(o, model);
            } else if (rule.resolveKey) {
                // resolveKey
                model[name] = _.get(o, rule.resolveKey(name), null);
            } else if (rule.prop) {
                // prop
                _.each(_.isArray(rule.prop) ? rule.prop : [rule.prop], (prop) => {
                    const value = _.get(o, prop, null);
                    if (!_.isNull(value)) { model[name] = value; }
                });
            } else if (_.has(o, name)) {
                // name
                model[name] = o[name];
            } else {
                model[name] = _.get(o, snakeCase(name), null);
            }

            if (_.isNull(model[name])) {
                model[name] = this.getDefaultAttributeValue(rule);
            }

            switch (rule.columnType) {
                case NgxExcelColumnType.PrimaryKey:
                    if (_.isSafeInteger(model[name])) {
                        model[name] = model[name].toString();
                    }
                    break;
                case NgxExcelColumnType.ForeignKey:
                    if (model[name] && rule.relativeService) {
                        model[name] = rule.relativeService.createModel(null, model[name]);
                    }
                    break;
                case NgxExcelColumnType.UploadFile:
                    if (_.isNull(model[name])) { break; }
                    model[name] = {
                        name: model[name]['file_name'],
                        url: model[name]['file_url'],
                        mimeType: model[name]['mime_type']
                    };
                    break;
                case NgxExcelColumnType.Bool:
                    model[name] = !!model[name];
                    break;
                case NgxExcelColumnType.Array:
                    model[name] = _.isArray(model[name]) ? model[name] : [];
                    break;
                case NgxExcelColumnType.DateTime:
                    if (model[name].length > 0) {
                        const object = utc(model[name], 'YYYY-MM-DD HH:mm:ss');
                        model[name] = object.isValid() ? object.format('YYYY-MM-DD HH:mm') : '';
                    }
                    break;
                case NgxExcelColumnType.Date:
                    if (model[name].length > 0) {
                        const object = utc(model[name], 'YYYY-MM-DD');
                        model[name] = object.isValid() ? object.format('YYYY-MM-DD') : '';
                    }
                    break;
                case NgxExcelColumnType.Time:
                    if (model[name].length > 0) {
                        const object = utc(model[name], 'HH:mm:ss');
                        model[name] = object.isValid() ? object.format('HH:mm') : '';
                    }
                    break;
                case NgxExcelColumnType.SelectOption:
                    if (!rule.selectOptions || _.isNull(model[name])) { break; }
                    const value = typeof (model[name]) === 'number' ? model[name].toString() : model[name];
                    model[name] = _.some(rule.selectOptions, (selectOption) => selectOption.value === value) ? model[name] : null;
                    break;
                case NgxExcelColumnType.TagsSelectOption:
                case NgxExcelColumnType.MultiSelectOption:
                    if (!rule.selectOptions || model[name].length === 0) { break; }
                    const range = _.map(model[name], (n) => typeof (n) === 'number' ? n.toString() : n);
                    model[name] = _.filter(rule.selectOptions, (selectOption) => _.some(range, selectOption.value));
                    break;
                case NgxExcelColumnType.MultiUploadFile:
                    if (model[name].length > 0) {
                        model[name] = model[name].map((n) => {
                            return { name: n['file_name'], url: n['file_url'], mimeType: n['mime_type'] };
                        });
                    }
                    break;
            }
        });

        return model as T;
    }

    /**
     * 解析提交参数
     * @param data 需要提交的消息体
     */
    protected resolveBody(data: { [name: string]: any }): { [name: string]: any } {
        const body: { [name: string]: any } = {};
        const rules = this.getRules();
        _.each(data, (value, name) => {
            if (!_.has(rules, name)) {
                _.set(body, snakeCase(name), value);
                return;
            }

            const rule = _.get(rules, name) as NgxExcelModelColumnRule<T>;
            let bodyKey = rule.prop ? (_.isArray(rule.prop) ? rule.prop[0] : rule.prop) : snakeCase(name);
            if (rule.columnType === NgxExcelColumnType.ForeignKey) {
                bodyKey += '_id';
            } else if (rule.columnType === NgxExcelColumnType.MultiForeignKey) {
                bodyKey += '_ids';
            }

            switch (rule.columnType) {
                case NgxExcelColumnType.ForeignKey:
                    if (value && rule.relativeService) {
                        body[bodyKey] = rule.relativeService.getPrimaryKey(value) || '';
                    }
                    break;
                case NgxExcelColumnType.MultiForeignKey:
                    body[bodyKey] = rule.relativeService ? _.map(value, (model) => rule.relativeService.getPrimaryKey(model)) : [];
                    break;
                case NgxExcelColumnType.SelectOption:
                    body[bodyKey] = _.get(value, 'value', '');
                    break;
                case NgxExcelColumnType.MultiSelectOption:
                    body[bodyKey] = _.map(value, 'value');
                    break;
                case NgxExcelColumnType.TagsSelectOption:
                    body[bodyKey] = _.map(value, 'label');
                    break;
                case NgxExcelColumnType.UploadFile:
                    body[bodyKey] = _.get(value, 'url', '');
                    break;
                case NgxExcelColumnType.MultiUploadFile:
                    body[bodyKey] = _.map(value, 'url');
                    break;
                case NgxExcelColumnType.Bool:
                    body[bodyKey] = value ? 1 : 0;
                    break;
                case NgxExcelColumnType.Currency:
                    body[bodyKey] = value ? parseFloat(value).toFixed(4) : '0.0000';
                    break;
                case NgxExcelColumnType.DateTime:
                case NgxExcelColumnType.Date:
                case NgxExcelColumnType.Time:
                    body[bodyKey] = '';
                    if (!value) { break; }

                    const sourceFormatter = rule.columnType === NgxExcelColumnType.DateTime ? 'YYYY-MM-DD HH:mm:ss' : (
                        rule.columnType === NgxExcelColumnType.Date ? 'YYYY-MM-DD' : 'HH:mm'
                    );
                    const targetFormatter = rule.columnType === NgxExcelColumnType.DateTime ? 'YYYY-MM-DD HH:mm' : (
                        rule.columnType === NgxExcelColumnType.Date ? 'YYYY-MM-DD' : 'HH:mm'
                    );
                    const object = utc(value, sourceFormatter);
                    body[bodyKey] = object.isValid() ? object.format(targetFormatter) : '';
                    break;
                default:
                    body[bodyKey] = value;
            }
        });
        return body;
    }

    /**
     * 获得属性的默认值
     * @param rule 属性规则
     */
    protected getDefaultAttributeValue(rule: NgxExcelModelColumnRule<T>): any {
        if (rule.default) {
            return rule.default;
        }
        let value: any;
        switch (rule.columnType) {
            case NgxExcelColumnType.PrimaryKey:
            // case NgxExcelColumnType.ForeignKey:
            case NgxExcelColumnType.Text:
            case NgxExcelColumnType.TextNumber:
            case NgxExcelColumnType.MultilineText:
            case NgxExcelColumnType.DateTime:
            case NgxExcelColumnType.Date:
            case NgxExcelColumnType.Time:
                value = '';
                break;
            case NgxExcelColumnType.Number:
                value = 0;
                break;
            case NgxExcelColumnType.Currency:
                value = '0.0000';
                break;
            case NgxExcelColumnType.Bool:
                value = false;
                break;
            case NgxExcelColumnType.Array:
            case NgxExcelColumnType.TagsSelectOption:
            case NgxExcelColumnType.MultiSelectOption:
            case NgxExcelColumnType.MultiForeignKey:
            case NgxExcelColumnType.MultiUploadFile:
                value = [];
                break;
            default:
                value = null;
        }
        return value;
    }

    /**
     * 获得默认模型
     */
    protected getDefaultModel(): T {
        const model = {};
        _.each(this.getRules(), (rule, name) => {
            model[name] = this.getDefaultAttributeValue(rule);
        });
        return model as T;
    }

    /**
     * 缓存模型
     * @param model 待缓存的模型
     */
    protected cache(model: T) {
        const primaryKey = this.getPrimaryKey(model);
        this.cachedModels[primaryKey] = model;
    }

    /**
     * 判断模型是否满足条件
     * @param model 待判断的模型
     * @param filters 筛选条件
     */
    protected isMatched(model: T, filters: { [param: string]: string | string[] }): boolean {
        return true;
    }

}
