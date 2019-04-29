export interface WebApiConfigArgs {
    gatewayUrl: string;
    requestHeaders: { [name: string]: string | string[] };
    debug?: boolean;
}

export class WebApiConfig implements WebApiConfigArgs {

    gatewayUrl: string;
    requestHeaders: { [name: string]: string | string[] } = {};
    debug = false;

    constructor(config: WebApiConfigArgs) {
        Object.assign(this, config);
    }

}
