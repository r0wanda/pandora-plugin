import { type UninterceptFunction } from "neptune-types/api/intercept";
import { Interface as Pandora } from "./Pandora";
import { actions, intercept, store } from "@neptune";
import safeUnload from "@inrixia/lib/safeUnload";
import { SafeStore, initSafeStore } from "./SafeStore";
import { log, warn, error } from './Logger';
import { loginPrompt, type LoginResponse } from "./Html";

export class Intercepts {
    ics: UninterceptFunction[];
    constructor() {
        this.ics = [];
    }
    register(ic: UninterceptFunction) {
        this.ics.push(ic);
    }
    quit() {
        const errs = [];
        for (const ic of this.ics) {
            try {
                ic();
            } catch (err) {
                errs.push(err);
            }
        }
        return errs.length > 0 ? new AggregateError(errs) : false;
    }
}

export default class Tidal {
    pand: Pandora;
    ics: Intercepts;
    safeStore?: SafeStore;
    #sSWait!: Promise<SafeStore>;
    authed: boolean;
    #loginRes?: LoginResponse;
    constructor() {
        this.pand = new Pandora();
        this.ics = new Intercepts();
        initSafeStore().then(this.init.bind(this)).catch(error);
        this.authed = false;
        this.loadIntercepts();
    }
    async init(sS: SafeStore): Promise<boolean> {
        // @ts-ignore
        log(sS);
        log('init pandora');
        if (this.authed) return true;
        try {
            this.safeStore = sS;
            this.safeStoreCheck();
            const user = this.safeStore.getItem('pandoraUser');
            const pass = this.safeStore.getItem('pandoraPass');
            //if (!user || !pass) await this.loginPrompt();
        } catch (err) {
            error(err);
            return false;
        }
        return true;
    }
    safeStoreCheck() {
        if (!this.safeStore) return;
        if (this.safeStore.native.backend() === 'basic_text') {
            warn('[Pandora] Using insecure encryption');
        }
    }
    static getChromeVersion() {
        // adapted from https://stackoverflow.com/a/47454708
        let pieces = navigator.userAgent.match(/Chrom(?:e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/);
        if (pieces == null || pieces.length != 5) {
            return undefined;
        }
        let arr = pieces.map(piece => parseInt(piece, 10));
        return {
            major: arr[1],
            minor: arr[2],
            build: arr[3],
            patch: arr[4]
        };
    }
    private _cssLegacy() {
        return (Tidal.getChromeVersion()?.major ?? 0) < 105;
    }
    loginPrompt(): Promise<[string, string]> {
        return new Promise(r => {
            const close = () => {
                this.#loginRes!.cont.style.animation = 'pandClose 0.5s linear forwards';
                setTimeout(() => {
                    this.#loginRes?.cont.remove();
                }, 600);
            }
            this.#loginRes = loginPrompt(this._cssLegacy());
            this.#loginRes.close.addEventListener('click', () => {
                close();
                throw new Error('Pandora is not logged in, stations will not work');
            });
            this.#loginRes.submit.addEventListener('click', async () => {
                if (this.#loginRes?.user.checkValidity()) {
                    error('Pandora email is invalid');
                    return;
                }
                if (this.#loginRes?.pass.checkValidity()) {
                    error('Pandora password is invalid');
                    return;
                }
                try {
                    const user = this.#loginRes?.user.value;
                    const pass = this.#loginRes?.pass.value;
                    await this.pand.login(user, pass);
                    close();
                    r([user!, pass!]);
                } catch (err) {
                    error(err);
                }
            });
        });
    }
    loadIntercepts() {
    }
    unload() {
        this.ics.quit();
        safeUnload();
    }
}