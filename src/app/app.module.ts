import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ContextMenuModule } from 'ngx-contextmenu';

import { NgxExcelModule } from 'ngx-excel';
import { WebApiModule } from './web-api';
import { BuilderModule } from './builder';

import { environment } from 'src/environments/environment';

import { AppComponent } from './app.component';
import { AppConfig } from './app.config';
import { PersonService } from './app.service';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        ContextMenuModule.forRoot(),
        WebApiModule.forRoot(environment.WebApiConfig),
        BuilderModule.forRoot(),
        NgxExcelModule
    ],
    providers: [
        { provide: AppConfig, useValue: environment },
        PersonService
    ],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule { }
