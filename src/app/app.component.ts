import { Component, InjectionToken, forwardRef, OnInit, Inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Platform } from '@angular/cdk/platform';
import { NgxExcelService } from 'ngx-excel';
import { AppConfig, AppConfigArgs } from './app.config';
import { PersonService } from './app.service';

export const AppComponentRef = new InjectionToken<AppComponent>('AppComponent');

@Component({
    selector: 'backend',
    templateUrl: './app.component.html',
    providers: [
        { provide: AppComponentRef, useExisting: forwardRef(() => AppComponent) },
        { provide: NgxExcelService, useExisting: PersonService }
    ]
})
export class AppComponent implements OnInit {

    public isMobileDevice = false;

    constructor(
        protected title: Title,
        protected platform: Platform,
        @Inject(AppConfig) protected appConfig: AppConfigArgs
    ) { }

    ngOnInit() {
        this.setTitle();
        this.isMobileDevice = this.platform.ANDROID || this.platform.IOS;
    }

    /**
     * 设置页面标题
     * @param name 页面标题
     */
    public setTitle(name?: string | string[]) {
        const titlePrefix = name ? (Array.isArray(name) ? name.reverse().join('_') : name) : '';
        this.title.setTitle(titlePrefix + (titlePrefix.length > 0 ? '_' : '') + this.appConfig.name);
    }

}
