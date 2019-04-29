import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpHeaders, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { WebApiConfig } from '../web-api.config';
import { WebApiHttpResponse } from '../web-api-http-response.model';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class HandleRequestInterceptor implements HttpInterceptor {

    protected extraRequestHeaders: { [name: string]: string | string[]; };
    protected debug: boolean;

    constructor(
        @Inject(WebApiConfig) config: WebApiConfig
    ) {
        this.extraRequestHeaders    = config.requestHeaders;
        this.debug                  = config.debug;
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const request = req.clone({ headers: this.handleRequestHeaders(req.headers) });
        return next.handle(request).pipe(
            map(this.handleResponse),
            catchError((err) => this.handleError(err, this.debug))
        );
    }

    /**
     * 附加请求头
     * @param headers 待附加的请求头
     */
    protected handleRequestHeaders(headers: HttpHeaders): HttpHeaders {
        Object.keys(this.extraRequestHeaders).forEach((name) => {
            if (headers.has(name)) { return; }
            headers = headers.append(name, this.extraRequestHeaders[name]);
        });
        return headers;
    }

    /**
     * 将响应转化为 NgxExcel 可识别的响应类型
     * @param res 原始的 HTTP 响应
     */
    protected handleResponse(res: HttpEvent<any>): HttpEvent<WebApiHttpResponse> {
        return (res instanceof HttpResponse) ? res.clone<WebApiHttpResponse>({
            body: new WebApiHttpResponse(res)
        }) : res;
    }

    /**
     * 处理错误影响
     * @param err 原始的错误信息
     * @param debug 是否调试模式
     */
    protected handleError(err: any, isDebug: boolean): Observable<never> {
        if (!(err instanceof HttpErrorResponse)) {
            if (isDebug) { console.warn(err); }
            return;
        }

        const method = 'handleError' + err.status.toString();
        return typeof(this[method]) === 'function' ? this[method](err) : this.handleErrorAny(err);
    }

    /**
     * 通用错误响应处理方法
     * @param err 原始的错误信息
     */
    protected handleErrorAny(err: HttpErrorResponse): Observable<never> {
        return throwError({ error: err, message: '系统错误，请联系管理员' });
    }

    /**
     * 错误 400 响应处理方法
     * @param err 原始的错误信息
     */
    protected handleError400(err: HttpErrorResponse): Observable<never> {
        return throwError({ error: err, message: '请先登陆' });
    }

    /**
     * 错误 403 响应处理方法
     * @param err 原始的错误信息
     */
    protected handleError403(err: HttpErrorResponse): Observable<never> {
        return throwError({ error: err, message: '无权限' });
    }

    /**
     * 错误 404 响应处理方法
     * @param err 原始的错误信息
     */
    protected handleError404(err: HttpErrorResponse): Observable<never> {
        return throwError({ error: err, message: '系统错误，接口已过期' });
    }

}
