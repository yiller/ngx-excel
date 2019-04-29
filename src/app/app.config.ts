import { InjectionToken } from '@angular/core';
import { WebApiConfigArgs } from './web-api';

export interface AppConfigArgs {
    production:     boolean;
    name:           string;
    WebApiConfig:   WebApiConfigArgs;
}

export const AppConfig = new InjectionToken<AppConfigArgs>('AppConfig');
