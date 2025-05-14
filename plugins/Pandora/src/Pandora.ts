// @ts-ignore
import got from 'got';
import { Blowfish } from 'egoroof-blowfish';
import Partners from './Partners';

export namespace Pj {
    export interface Licensing {
        isAllowed: boolean;
    }
    export interface Partner {
        stationSkipLimit: number;
        partnerId: string;
        partnerAuthToken: string;
        syncTime: string;
        stationSkipUnit: string;
    }
    export interface User {
        username: string;
        canListen: boolean;
        userId: string;
        listeningTimeoutMinutes: string;
        zeroVolumeNumMutedTracks: number;
        maxStationsAllowed: number;
        zeroVolumeAutoPauseEnabledFlag: boolean;
        listeningTimeoutAlertsMsgUri: string;
        userAuthToken: string;
    }
    export namespace Search {
        export interface Base {
            score: number;
            musicToken: string;
            likelyMatch?: boolean;
        }
        export interface Artist extends Base {
            artistName: string;
        }
        export interface Song extends Artist {
            songName: string;
        }
        export interface Genre extends Base {
            stationName: string;
        }
    }
    export interface Search {
        nearMatchesAvailable: boolean;
        explanation: string;
        songs: Search.Song[];
        artists: Search.Artist[];
        genreStations: Search.Genre[];
    }
    export interface Station {
        stationId: string;
        stationName: string;
        artUrl?: string;
        allowAddMusic: boolean;
        allowRename: boolean;
        allowDelete: boolean;
    }
    export interface Stations {
        stations: Station[];
        checksum: string;
    }
    export interface Checksum {
        checksum: string;
    }
}
export type PandoraJson<T> = {
    stat: 'ok' | 'fail';
    message?: string;
    code?: number;
    result?: T;
}

export interface SearchOpts {
    includeNearMatches: boolean;
    includeGenreStations: boolean;
}

export default class Api {
    #user: string;
    #pass: string;
    #enc?: Blowfish;
    #dec?: Blowfish;
    #partner?: Pj.Partner;
    #syncTime?: number;
    auth?: Pj.User;
    token?: string;
    constructor(user = '', pass = '') {
        this.#user = user;
        this.#pass = pass;
    }
    setUser(user: string) {
        this.#user = user;
    }
    setPass(pass: string) {
        this.#pass = pass;
    }
    _url(method: string, params?: { [key: string]: string }) {
        params = params || {};
        params.method = method;
        if (this.#partner) {
            params.partner_id ??= this.#partner.partnerId;
        }
        if (this.auth && this.token) {
            params.auth_token ??= this.token;
            params.user_id ??= this.auth.userId;
        }
        const url = new URL('https://tuner.pandora.com/services/json');
        for (const k in params) url.searchParams.set(k, params[k]);
        return url.href;
    }
    res<T>(r: PandoraJson<T>, err: Error): T {
        if (r.stat !== 'ok') throw err;
        else return r.result!;
    }
    _auth(): this is Required<Api> {
        return !!this.token;
    }
    sync() {
        if (!this.#syncTime) throw new Error('Cannot sync');
        return Date.now() - this.#syncTime;
    }
    hexEnc(body: object) {
        if (!this.#enc) throw new Error('Cannot encrypt');
        return Buffer.from(this.#enc.encode(JSON.stringify(body))).toString('hex');
    }
    /**
     * Check if Pandora is available in your area
     * @see {@link https://6xq.net/pandora-apidoc/json/authentication/#check-licensing}
     */
    async checkLicensing(): Promise<boolean> {
        const res: PandoraJson<Pj.Licensing> = await got(this._url('test.checkLicensing')).json();
        const r = this.res(res, new Error(`Licensing was not ok: ${res.message}`));
        return !!r.isAllowed;
    }
    /**
     * Partner login
     * @param partner The device partner to use. Android is recommended and default. 
     * @see {@link https://6xq.net/pandora-apidoc/json/authentication/#partner-login}
     * @returns 
     */
    async partnerLogin(partner: keyof typeof Partners = 'android'): Promise<Pj.Partner> {
        const p = Partners[partner];
        if (!p) throw new Error(`Partner username ${partner} is invalid`);
        const r: PandoraJson<Pj.Partner> = await got.post(this._url('auth.partnerLogin'), {
            json: {
                username: partner,
                password: p.pass,
                deviceModel: p.id,
                version: '5'
            }
        }).json();
        const rTime = Date.now();
        this.#enc = new Blowfish(p.encrypt);
        this.#dec = new Blowfish(p.decrypt, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
        const res = this.res(r, new Error(`Partner login was not ok: ${r.message}`));
        this.#partner = res;
        const buf = Buffer.from(res.syncTime, 'hex');
        const dec = this.#dec.decode(buf, Blowfish.TYPE.UINT8_ARRAY).slice(4);
        const time = parseInt(Buffer.from(dec).toString('utf8'));
        this.#syncTime = rTime - time;
        return this.#partner!;
    }
    /**
     * Generic api method
     * @param method Method
     * @param body Request body
     * @param auth Authorization needed
     * @param params URL search params
     * @returns response.result or throw
     */
    async fetch<T>(method: string, body?: object, auth = false, params?: Record<string, string>): Promise<T> {
        if (auth && !this._auth()) throw new Error('Must log in before doing any operations');
        body = {
            ...(auth ? { userAuthToken: this.token } : {}),
            syncTime: this.sync(),
            ...body
        }
        const enc = this.hexEnc(body);
        const res: PandoraJson<T> = await got.post(this._url(method, params), {
            body: enc
        }).json();
        const r = this.res(res, new Error(`Error ${res.code} occured: ${res.message} (method: ${method})`));
        return r;
    }
    /**
     * User login, done after partner login.
     * @see {@link https://6xq.net/pandora-apidoc/json/authentication/#user-login}
     */
    async userLogin(): Promise<Pj.User> {
        if (!this.#partner || !this.#syncTime || !this.#enc) throw new Error('Partner login must be done before user login');
        if (!this.#user || !this.#pass) throw new Error('No username/email or password given');
        const r = await this.fetch<Pj.User>('auth.userLogin', {
            loginType: 'user',
            username: this.#user,
            password: this.#pass,
            partnerAuthToken: this.#partner.partnerAuthToken,
        }, false, {
            auth_token: encodeURIComponent(this.#partner.partnerAuthToken)
        });
        this.auth = r;
        this.token = r.userAuthToken;
        return r;
    }
    /**
     * Search for a song or artist
     * @param term Search term
     * @param opts Options
     * @see {@link https://6xq.net/pandora-apidoc/json/stations/#search}
     * @returns 
     */
    async search(term: string, opts?: Partial<SearchOpts>) {
        opts ??= {};
        const r = await this.fetch<Pj.Search>('music.search', {
            searchText: term,
            ...opts
        }, true);
        return r;
    }
    /**
     * Retrieve station list
     * @param opts Options
     * @see {@link https://6xq.net/pandora-apidoc/json/stations/#retrieve-station-list}
     * @returns 
     */
    async stationList(opts?: object) {
        opts ??= {};
        const r = await this.fetch<Pj.Stations>('user.getStationList', {
            includeStationArtUrl: true,
            ...opts
        }, true);
        return r;
    }
    /**
     * Delete a station
     * @param stat Station to delete
     * @returns True if successful, otherwise false
     */
    async delStation(stat: Pj.Station) {
        if (!stat.allowDelete) return false;
        try {
            await this.fetch<undefined>('station.deleteStation', {
                stationToken: stat.stationId
            }, true);
            return true;
        } catch (err) {
            return false;
        }
    }
    /**
     * Get station checksum
     * @see {@link https://6xq.net/pandora-apidoc/json/stations/#check-station-list-for-modifications}
     * @returns Checksum string
     */
    async stationChecksum() {
        const r = await this.fetch<Pj.Checksum>('user.getStationListChecksum', {}, true);
        return r.checksum;
    }

    /**
     * Login to Pandora
     * @param user Username/email (if not provided in constructor or set manually)
     * @param pass Password (if not provided in constructor or set manually)
     * @returns User login response 
     */
    async login(user?: string, pass?: string) {
        if (user) this.#user = user;
        if (pass) this.#pass = pass;
        if (!await this.checkLicensing()) throw new Error('Pandora is not available in your area');
        await this.partnerLogin();
        return await this.userLogin();
    }
    init() {
        return <Promise<void>><unknown>this.login();
    }
}

export class Interface extends Api {
    stations?: Pj.Stations;
    constructor(user = '', pass = '') {
        super(user, pass);
    }
    /**
     * Sync cached station list
     */
    async _syncStations() {
        if (this.stations) {
            const cs = await this.stationChecksum();
            if (cs === this.stations.checksum) return;
        }
        this.stations = await this.stationList();
    }
    /**
     * Check that stations are not exceeded
     */
    async _checkStations() {
        await this._syncStations();
        if (!this.stations) throw new Error('Station list not found');
        if (this.stations.stations.length < this.auth!.maxStationsAllowed) {
            // delete oldest station
            let ok = false;
            let i = 1;
            do {
                const idx = this.stations.stations.length - i++;
                if (idx < 0) break;
                if (this.stations.stations[idx].stationName.endsWith('TIDAL'))
                    ok = await this.delStation(this.stations.stations[idx]);
            } while (!ok);
            if (!ok) throw new Error('Station list full and automatic clearing has failed');
        }
    }
    async addStation() {
        await this._checkStations();
    }
}
