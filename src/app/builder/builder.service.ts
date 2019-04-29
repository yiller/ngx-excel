import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxExcelHelper, NgxExcelHttpResponse } from 'ngx-excel';
// import { FileUploaderOptions, FileUploader } from 'ng2-file-upload';
import { SelectOption } from './models/select-option.model';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, mergeMap, catchError } from 'rxjs/operators';
import { utc } from 'moment';

@Injectable()
export class BuilderService extends NgxExcelHelper {

    protected readySubject = new BehaviorSubject<boolean>(false);

    constructor(
        protected httpClient: HttpClient
    ) {
        super();
    }

    /**
     * 加载最新的配置
     */
    public loadConfig(): Observable<boolean> {
        if (sessionStorage.getItem('builderReady') === 'true') {
            this.readySubject.next(true);
            return of(true);
        }

        const currentVersion = localStorage.getItem('builderVersion') || '';
        let latestVersion = '';
        return this.httpClient.get('enumerations/_version').pipe(
            map((res: NgxExcelHttpResponse) => {
                latestVersion = res.getModel<string>((o) => o['version'] || '');
                return currentVersion.length === 0 || currentVersion < latestVersion;
            }),
            mergeMap((isOlderVersion) => isOlderVersion ? this.syncSelectGroups() : of(true)),
            tap((success) => {
                if (!success) { return; }
                localStorage.setItem('builderVersion', latestVersion);
                sessionStorage.setItem('builderReady', 'true');
                this.readySubject.next(true);
            })
        );
    }

    /**
     * 获得资源准备订阅源
     */
    public getReadySubject(): Observable<boolean> {
        return this.readySubject as Observable<boolean>;
    }

    /**
     * 同步远程枚举
     */
    protected syncSelectGroups(): Observable<boolean> {
        return this.pullSelectGroups().pipe(
            map((selectGroups) => {
                const expiredTime = utc().add(30, 'days');
                localStorage.setItem('syncedSelectGroups', JSON.stringify({ 'selectGroups': selectGroups, 'expiredTime': expiredTime.format('YYYY-MM-DD HH:mm:ss') }));
                return true;
            }),
            catchError(() => of(false))
        );
    }

    /**
     * 拉取远程枚举
     */
    protected pullSelectGroups(): Observable<Array<{ name: string, items: SelectOption[] }>> {
        return this.httpClient.get('enumerations').pipe(
            map((res: NgxExcelHttpResponse) => res.getCollection<{ name: string, items: SelectOption[] }>('enumerations', (o) => {
                return { name: o['name'], items: this.flattenSelectOptions(o['items']) };
            }))
        );
    }

    /**
     * 获得已经同步的选项列表
     */
    protected getSyncedSelectGroups(): Array<{ name: string, options: SelectOption[] }> {
        const syncedSelectGroupsJson = localStorage.getItem('syncedSelectGroups') || '';
        if (!syncedSelectGroupsJson) {
            return [];
        }
        const syncedSelectGroups = JSON.parse(syncedSelectGroupsJson);
        return syncedSelectGroups['selectGroups'] || [];
    }

    /**
     * 根据 name 列表获得选项列表
     * @param name 枚举名列表
     */
    public getSelectGroups(name: string[]): Array<{ name: string, options: SelectOption[] }> {
        const syncedSelectGroups = this.getSyncedSelectGroups();
        const selectGroups: Array<{ name: string, options: SelectOption[] }> = [];
        syncedSelectGroups.forEach((syncedSelectGroup) => {
            if (syncedSelectGroup['name'].length > 0 && name.indexOf(syncedSelectGroup['name']) >= 0) {
                selectGroups.push({ name: syncedSelectGroup['name'], options: syncedSelectGroup['items'] });
            }
        });
        return selectGroups;
    }

    protected flattenSelectOptions(o: Array<any>, prefix?: string): SelectOption[] {
        const selectOptions: SelectOption[] = [];
        o.forEach((item) => {
            if (item['children']) {
                selectOptions.push(...this.flattenSelectOptions(item['children'], (prefix ? (prefix + '-') : '') + item['label']));
            } else {
                selectOptions.push({
                    label: item['label'],
                    value: typeof(item['value']) === 'number' ? item['value'].toString() : item['value'],
                });
            }
        });
        return selectOptions;
    }

    /**
     * 获得上传控件对象
     * @param options 上传配置
     */
    /*public getUploader(options: FileUploaderOptions, onSuccess?: (file: UploadFile) => any, onComplete?: () => any, onError?: (res: any) => any): FileUploader {
        const uploader = new FileUploader(Object.assign({
            autoUpload: false,
            method: 'post',
            itemAlias: 'upload_files',
            disableMultipart: false,
            url: this.appConfig.gatewayUrl + '/documents/_upload'
        }, options));

        uploader.onSuccessItem = (_, response: string) => {
            if (onSuccess) {
                const responseJson = JSON.parse(response)['data'];
                const file: UploadFile = { name: responseJson.file_name || '', url: responseJson.file_url || '', mimeType: responseJson.mime_type || '' };
                onSuccess(file);
            }
        };

        uploader.onCompleteAll = () => {
            if (onComplete) {
                onComplete();
            } else {
                console.log('上传完成');
            }
        };

        uploader.onErrorItem = (_, response: string) => {
            if (onError) {
                onError(JSON.parse(response));
            } else {
                console.warn(JSON.parse(response));
            }
        };

        uploader.onCancelItem = () => {
            // console.log('cancel');
        };

        return uploader;
    }*/
}
