import { NgxExcelService } from './ngx-excel.service';
import { NgxExcelModelColumnRule, NgxExcelHttpResponse } from '../models';
import { Observable, of } from 'rxjs';
import { delay, mergeMap, map } from 'rxjs/operators';

export abstract class NgxExcelAggregateService<T> {

    protected cached = false;
    protected cacheable = false;
    protected cachedMap: { [name: string]: string[] } = {};
    protected cachedModels: { [name: string]: T } = {};
    protected cachedMetas: { [name: string]: any } = {};

    protected decentralRootIndex = 0;
    protected decentralServices: NgxExcelService<any>[] = [];
    protected resourceUriParams: { [param: string]: string } = {};
    protected filterKeysWhitelist: string[] = [];

    /**
     * 绑定分离的多个服务
     * @param decentralServices 分离的 Service 列表
     * @param decentralRootIndex 当前的起始 Service 索引 (缺省0)
     */
    public bindDecentralServices(decentralServices: NgxExcelService<any>[], decentralRootIndex?: number): NgxExcelAggregateService<T> {
        this.decentralServices = decentralServices;
        this.decentralRootIndex = decentralRootIndex || 0;
        if (this.decentralRootIndex >= this.decentralServices.length) {
            this.decentralRootIndex = 0;
        }
        return this;
    }

    /**
     * 绑定资源URI中的路由参数
     * @param params 绑定资源路由中的参数
     */
    public bindUriParams(params: { [param: string]: string }): NgxExcelAggregateService<T> {
        this.resourceUriParams = params;
        this.decentralServices.forEach((decentralService) => decentralService.bindUriParams(params));
        return this;
    }

    /**
     * 获得所有字段的模型规则
     */
    public getRules(): { [name in keyof T]: NgxExcelModelColumnRule<T> } {
        if (this.decentralServices.length === 0) { return null; }
        return this.decentralServices[this.decentralServices.length - 1].getRules() as { [name in keyof T]: NgxExcelModelColumnRule<T> };
    }

    /**
     * 获得指定字段的模型规则
     * @param name 字段标识名
     */
    public getRule(name: string): NgxExcelModelColumnRule<T> {
        if (this.decentralServices.length === 0) { return null; }
        return this.decentralServices[this.decentralServices.length - 1].getRule(name);
    }

    /**
     * 清空缓存数据
     */
    public clearCaches() {
        this.cached = false;
        this.cachedMap = {};
        this.cachedModels = {};
        this.cachedMetas = {};
    }

    /**
     * 从外部写入数据
     * @param model 数据模型
     */
    public append(model: any) {
        this.cache(model, this.decentralRootIndex);
    }

    /**
     * 获得模型列表的资源响应
     * @param filters 筛选条件
     */
    public getListResponse(filters?: { [param: string]: string | string[] }): Observable<NgxExcelHttpResponse> {
        // 已经缓存了则直接从缓存中拉取根节点数据
        if (this.cached) {
            const res = new NgxExcelHttpResponse(null);
            Object.keys(this.cachedMetas).forEach((cachedMetaKey) => res.setMeta(cachedMetaKey, this.cachedMetas[cachedMetaKey]));
            const list: T[] = [];
            Object.keys(this.cachedModels).forEach((cachedModelKey) => {
                if (cachedModelKey.indexOf('0-') !== 0 || !this.isMatched(this.cachedModels[cachedModelKey], filters)) { return; }
                list.push(this.cachedModels[cachedModelKey]);
            });
            if (!this.cacheable) {
                this.cached = false;
            }
            // 延迟 200 毫秒，因为可能引起组件的脏检测
            return of(res.setMeta('total', list.length).setCollection<T>('list', list)).pipe(delay(200));
        }

        if (this.decentralServices.length === 0) {
            return null;
        }

        const params = {};
        if (filters) {
            Object.keys(filters).forEach((name) => {
                if (name !== 'meta' && this.filterKeysWhitelist.indexOf(name) < 0) { return; }
                params[name] = filters[name];
            });
        }

        return this.decentralServices[this.decentralRootIndex].getListResponse(params).pipe(
            mergeMap((res: NgxExcelHttpResponse) => {
                this.clearCaches();
                this.cachedMetas = res.getMetas();
                return this.decentralServices[this.decentralRootIndex].getList(res);
            }),
            mergeMap((models: any[]) => {
                models.forEach((model) => this.append(model));
                this.cached = true;
                return this.getListResponse(filters);
            })
        );
    }

    /**
     * 获得模型列表
     * @param response 服务器响应对象或筛选条件
     */
    public getList(response?: NgxExcelHttpResponse | { [param: string]: string | string[] }): Observable<T[]> {
        const obs = response instanceof NgxExcelHttpResponse ? of(response) : this.getListResponse(response);

        if (!obs) {
            return of([]);
        }

        return obs.pipe(
            map((res: NgxExcelHttpResponse) => res.getCollection<T>('list'))
        );
    }

    /**
     * 获得指定模型的子模型列表
     * @param model 父模型
     * @param filters 筛选条件
     */
    public getChildren(model: T, filters?: { [param: string]: string | string[] }): Observable<T[]> {
        const level = this.getModelLevel(model);
        const cachedMapKey = this.getPrimaryKey(model, level);
        if (this.cachedMap[cachedMapKey]) {
            const children: T[] = [];
            this.cachedMap[cachedMapKey].forEach((cachedModelKey) => {
                if (!this.cachedModels[cachedModelKey]) { return; }
                const cachedModel = this.cachedModels[cachedModelKey];
                if (!this.isMatched(cachedModel, filters)) { return; }
                children.push(this.cachedModels[cachedModelKey]);
            });
            return of(children);
        }

        const levelChild = level + 1;
        if (this.decentralServices.length <= levelChild || !this['createModel' + levelChild]) {
            return of([]);
        }

        return this.decentralServices[levelChild]
            .bindUriParams(Object.assign({}, this.resourceUriParams, this.getForeignKeys(model)))
            .getList(filters).pipe(
                map((list: any[]) => list.map((item) => this['createModel' + levelChild](item, levelChild)))
            );
    }

    /**
     * 判断模型的父子关系
     * @param parent 父模型
     * @param child 子模型
     */
    public isChild(parent: T, child: T): boolean {
        const level = this.getModelLevel(parent);
        return this.getPrimaryKey(parent, level) === this.getPrimaryKey(child, level);
    }

    /**
     * 判断模型是否满足条件
     * @param model 待判断的模型
     * @param filters 筛选条件
     */
    protected isMatched(model: T, filters: { [param: string]: string | string[] }): boolean {
        return true;
    }

    /**
     * 缓存数据
     * @param model 待缓存的模型
     * @param level 缓存层级
     */
    protected cache(model: any, level: number) {
        const cachedModels: T[] = [];
        for (let i = 0; i <= level; i++) {
            if (!this['createModel' + i]) {
                console.warn('未定义 createModel' + i + ' 方法');
                cachedModels.push(null);
                continue;
            }
            cachedModels.push(this['createModel' + i](model, level));
        }
        for (let i = 0; i < cachedModels.length; i++) {
            if (!cachedModels[i]) { continue; }
            // const cachedModelKey = i + '-' + this.getPrimaryKey(cachedModels[i], i);
            const cachedModelKey = this.getPrimaryKey(cachedModels[i], i);
            this.cachedModels[cachedModelKey] = cachedModels[i];

            for (let j = i + 1; j < cachedModels.length; j++) {
                if (!cachedModels[j]) { continue; }
                // const childModelKey = j + '-' + this.getPrimaryKey(cachedModels[j], j);
                const childModelKey = this.getPrimaryKey(cachedModels[j], j);
                if (this.cachedMap[cachedModelKey]) {
                    this.cachedMap[cachedModelKey].push(childModelKey);
                } else {
                    this.cachedMap[cachedModelKey] = [ childModelKey ];
                }
            }
        }
    }

    /**
     * 判断模型的层级
     * @param model 待判断的模型
     */
    protected abstract getModelLevel(model: T);

    /**
     * 获得模型主键
     * @param model 模型
     * @param level 层级
     */
    public abstract getPrimaryKey(model: T, level?: number): string;

    /**
     * 获得外键信息
     * @param model 模型
     */
    protected abstract getForeignKeys(model: T): { [name: string]: string };
}
