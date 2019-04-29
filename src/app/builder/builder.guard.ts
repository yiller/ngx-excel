import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BuilderService } from './builder.service';
import { Observable } from 'rxjs';

@Injectable()
export class BuilderGuard implements CanActivate {

    constructor(
        protected builderService: BuilderService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.builderService.loadConfig();
    }

}
