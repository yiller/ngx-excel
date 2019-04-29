import { InjectionToken, NgModule, ModuleWithProviders, ANALYZE_FOR_ENTRY_COMPONENTS } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { WebApiConfigArgs, WebApiConfig } from './web-api.config';
import { GatewayInterceptor } from './interceptors/gateway.interceptor';
import { HandleRequestInterceptor } from './interceptors/handle-request.interceptor';

const WebApiOptions = new InjectionToken<WebApiConfigArgs>('config');

export function factoryWebApiConfig(config: WebApiConfigArgs): WebApiConfig {
    return new WebApiConfig(config);
}

@NgModule({
    imports: [
        HttpClientModule
    ]
})
export class WebApiModule {

    static forRoot(config: WebApiConfigArgs): ModuleWithProviders {
        return {
            ngModule: WebApiModule,
            providers: [
                { provide: WebApiOptions, useValue: config },
                { provide: ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: config },
                { provide: WebApiConfig, useFactory: factoryWebApiConfig, deps: [WebApiOptions] },
                { provide: HTTP_INTERCEPTORS, useClass: GatewayInterceptor, multi: true },
                { provide: HTTP_INTERCEPTORS, useClass: HandleRequestInterceptor, multi: true }
            ]
        };
    }

}
