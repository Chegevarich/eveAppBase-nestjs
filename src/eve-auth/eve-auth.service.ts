import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Req, Res } from '@nestjs/common';

import { catchError, map } from 'rxjs';
import { Request, Response } from "express"
import { UserDataDto } from './dto/user-data.dto';

@Injectable()
export class EveAuthService {
    constructor(private httpService: HttpService) {
    }

    private clientId: string = '3ca67e2c92274879a5b4695d771abaa3';
    private secret: string = 'a6vYpq9E0bgHTMssWJXJPuoRX2PmQQwF4Bddq1bE';
    private scope: string = 'publicData esi-location.read_location.v1 esi-skills.read_skills.v1 esi-skills.read_skillqueue.v1';

    public baseUrl: string = 'https://esi.evetech.net/latest/';

    private characterId: number;

    private characterName: string;

    /**
     * delimiter space (default by copying from app dev page)
     */
    private tokenScopes: string;

    /**
     * auth url
     * @var string 
     */
    private redirect: string = 'http://localhost:3000/eve-auth/callback';

    /**
     * state for auth, random string
     * @var string
     */
    public state: string = 'lolkekcheburek';

    /**
     * After success auth where to go
     * @var string
     */
    private baseRedirectUrl: string = 'EVE_BASE_REDIRECT_URL';

    /**
     * JWT access token
     * @var string
     */
    private accessToken: string;

    /**
     * seconds to token expire
     * @var integer
     */
    private expiresIn: number;

    /**
     * token type (JWT now)
     * @var string
     */
    private tokenType: string = 'Bearer';

    /**
     * refresh token
     * @var string
     */
    private refreshToken: string;

    /**
     * array of options name to build this class
     * TODO DTO!
     * @var array
     */
    private $objVars: string[] = [
        'characterId',
        'characterName',
        'tokenScopes',
        'accessToken',
        'expiresIn',
        'refreshToken',
    ];

    public authRedirect: string = 'https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=' + this.redirect + '&client_id=' + this.clientId + '&scope=' + this.scope + '&state=' + this.state

    userObject: UserDataDto = new UserDataDto();

    response: Response;

    /**
     * where is the auth data?
     */
    readState(@Req() request: Request) {
        this.userObject = new UserDataDto();
        this.userObject.characterId = request.cookies['characterId']
        this.userObject.characterName = request.cookies['characterName']
        this.userObject.tokenScopes = request.cookies['tokenScopes']
        this.userObject.accessToken = request.cookies['accessToken']
        this.userObject.expiresIn = request.cookies['expiresIn']
        this.userObject.refreshToken = request.cookies['refreshToken']
    }

    /**
     * where to store auth data?
     */
    storeState(@Res({ passthrough: true }) response: Response) {
        response.cookie('characterId', this.userObject.characterId)
        response.cookie('characterName', this.userObject.characterName)
        response.cookie('tokenScopes', this.userObject.tokenScopes)
        response.cookie('accessToken', this.userObject.accessToken)
        response.cookie('expiresIn', this.userObject.expiresIn)
        response.cookie('refreshToken', this.userObject.refreshToken)
    }

    /**
     * what to do when auth is failed
     */
    authFailed(@Res({ passthrough: true }) response: Response) {
        // TODO check da fOkin spell
        response.redirect('https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=' + this.redirect + '&client_id=' + this.clientId + '&scope=' + this.scope + '&state=' + this.state)
    }

    // todo check the data format
    // todo check the config format
    async curl(url: string, data, config, get: boolean = true) {
        if (get) {
            return this.httpService.get(url).pipe(map(response => response.data));
        } else {
            return this.httpService.post(url, data, config).pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(response => response.data));
        }

    }

    getAuthInfoByCode(code): Promise<string> {
        var request = require("request");
        let buff = Buffer.from(('3ca67e2c92274879a5b4695d771abaa3' + ':' + 'a6vYpq9E0bgHTMssWJXJPuoRX2PmQQwF4Bddq1bE'))
        var options = {
            method: 'POST',
            url: 'https://login.eveonline.com/v2/oauth/token',
            headers:
            {
                host: 'login.eveonline.com',
                'content-type': 'application/x-www-form-urlencoded',
                'cache-control': 'no-cache',
                authorization: `Basic ${buff.toString('base64')}`
            },
            body: `grant_type=authorization_code&code=${code}`
        };

        return new Promise<string>((resolve, reject) => {
            request(options, function (err, response, body) {
                if (err) reject(err);
                resolve(response.body);
            });
        })

    }

    async workWithCodeAndState(code: string): Promise<boolean> {
        let buff = Buffer.from((this.clientId + ':' + this.secret))
        const headersRequest = {
            'authorization': 'Basic ' + buff.toString('base64'),
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded',
            'host': 'login.eveonline.com',
        };
        let response = JSON.parse(await this.getAuthInfoByCode(code));


        if (response.error) {
            return false;
        } else if (response.access_token) {
            this.userObject.accessToken = response.access_token
            this.userObject.expiresIn = Date.now()/1000 + 10; //parseInt(response.expires_in);
            this.tokenType = response.token_type;
            this.userObject.refreshToken = response.refresh_token;

            if(await this.jwtVerify(response.access_token) === true) {
                return true;
            } else {
                return false;
            }
        }
    }

    getJwtVerify(accessToken: string): Promise<string> {
        var request = require("request");
        var options = {
            method: 'GET',
            url: 'https://esi.evetech.net/verify',
            headers:
            {
                'Authorization' : 'Bearer ' + accessToken,
                'Content-Type' : 'application/x-www-form-urlencoded',
            },
        };

        return new Promise<string>((resolve, reject) => {
            request(options, function (err, response, body) {
                if (err) reject(err);
                resolve(response.body);
            });
        })

    }

    async jwtVerify(accessToken: string): Promise<boolean> {
        let response = JSON.parse(await this.getJwtVerify(accessToken));

        if (typeof response.error != 'undefined') {
            return false
        } else {
            this.userObject.characterId = response.CharacterID;
            this.userObject.characterName = response.CharacterName;
            this.userObject.tokenScopes = response.Scopes;
            return true
        }
    }

    refreshAccessTokenRequest(): Promise<string> {
        var request = require("request");
        let buff = Buffer.from(('3ca67e2c92274879a5b4695d771abaa3' + ':' + 'a6vYpq9E0bgHTMssWJXJPuoRX2PmQQwF4Bddq1bE'))
        var options = {
            method: 'POST',
            url: 'https://login.eveonline.com/v2/oauth/token',
            headers:
            {
                'Authorization' : 'Basic ' + buff.toString('base64'),
                'Content-Type' : 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(this.userObject.refreshToken) + '&scope=' + encodeURIComponent(this.scope)
        };

        return new Promise<string>((resolve, reject) => {
            request(options, function (err, response, body) {
                if (err) reject(err);
                resolve(response.body);
            });
        })

    }

    async refreshAccessToken(): Promise<boolean> {
        let response = JSON.parse(await this.refreshAccessTokenRequest());
        if (typeof response.error != 'undefined') {
            return false
        } else {
            this.userObject.accessToken = response.access_token;
            this.userObject.refreshToken = response.refresh_token;
            this.userObject.expiresIn = Date.now()/1000 + parseInt(response.expires_in);
            return true;
        }
    }

}
