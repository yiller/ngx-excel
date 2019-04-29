import { HttpResponse } from '@angular/common/http';

export class NgxExcelHttpResponse {

    protected originalResponse: HttpResponse<any>;
    protected meta: { [name: string]: any };
    protected model: any;
    protected collections: { [name: string]: Array<any> } = {};

    constructor(
        protected httpResponse: HttpResponse<any>
    ) {
        this.originalResponse = httpResponse;
    }

    protected getResponseBody() {
        return this.originalResponse ? this.originalResponse.body : {};
    }

    /**
     * 获得接口返回的响应码
     */
    public getCode(): number {
        return this.getResponseBody()['code'] || 0;
    }

    /**
     * 获得接口返回的附加信息
     */
    public getMessage(): string {
        return this.getResponseBody()['message'] || 0;
    }

    /**
     * 获得接口返回的元信息
     */
    public getMetas(): { [name: string]: any } {
        if (!this.meta) {
            this.meta = this.getResponseBody()['meta'] || {};
        }
        return this.meta;
    }

    /**
     * 获得接口返回的指定元信息
     * @param name 元信息键名
     * @param defaultValue 默认值
     */
    public getMeta(name: string, defaultValue?: any): any {
        const metas = this.getMetas();
        return metas[name] || defaultValue || null;
    }

    /**
     * 手动设置元信息
     * @param name 元信息键名
     * @param value 元信息值
     */
    public setMeta(name: string, value: any): NgxExcelHttpResponse {
        this.getMeta(name);
        this.meta[name] = value;
        return this;
    }

    /**
     * 获得接口返回的主资源
     * @param transform 转换方法
     */
    public getModel<T>(transform?: (o: any) => T): T {
        if (!this.model) {
            this.model = typeof(this.getResponseBody()['data']) === 'undefined' ? null : (
                transform ? transform(this.getResponseBody()['data']) : (this.getResponseBody()['data'] as T)
            );
        }
        return this.model as T;
    }

    /**
     * 手动设置主资源
     * @param model 主资源
     */
    public setModel<T>(model: T): NgxExcelHttpResponse {
        this.model = model;
        return this;
    }

    /**
     * 获得接口返回的资源集合
     * @param name 资源集合键名
     * @param transform 转换方法
     */
    public getCollection<T>(name: string, transform?: (o: any) => T): T[] {
        if (!this.collections[name]) {
            const collection = typeof(this.getResponseBody()['_embedded']) === 'undefined' || typeof(this.getResponseBody()['_embedded'][name]) === 'undefined' ? [] : (
                transform ?
                    Array.from(this.getResponseBody()['_embedded'][name]).map(transform) :
                    (this.getResponseBody()['_embedded'][name] as T[])
            );
            this.collections[name] = collection;
        }
        return this.collections[name] as T[];
    }

    /**
     * 手动设置资源集合
     * @param name 资源集合键名
     * @param collection 集合列表
     */
    public setCollection<T>(name: string, collection: T[]): NgxExcelHttpResponse {
        this.collections[name] = collection;
        return this;
    }

}
