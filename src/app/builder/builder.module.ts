import { NgModule, ModuleWithProviders } from '@angular/core';
import { BuilderGuard } from './builder.guard';
import { BuilderService } from './builder.service';
import { WebApiModule } from '../web-api/web-api.module';

@NgModule({
    imports: [
        WebApiModule
    ]
})
export class BuilderModule {

    public static forRoot(): ModuleWithProviders {
        return {
            ngModule: BuilderModule,
            providers: [
                BuilderService,
                BuilderGuard
            ]
        };
    }

}
