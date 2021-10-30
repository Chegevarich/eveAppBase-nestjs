import { Body, Controller, Get, Param, Post, Query, Redirect, Req, Res } from '@nestjs/common';
import { EveAuthService } from './eve-auth.service';
import { Request, Response } from "express"
import { UserDataDto } from './dto/user-data.dto';

@Controller('eve-auth')
export class EveAuthController {
    constructor(private eveAuthService: EveAuthService) {
    }

    private defaultPatterns = [
        ['characterId' , '{CHARACTERID}'],
        ['accessToken' , '{ACCESSTOKEN}'],
    ]

    status: number
    body: any
    userObject: UserDataDto;
    response: Response;

    @Get('testtest')
    testtest(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        return 123;
    }

    @Get('test')
    async test(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        let isItOk: boolean = await this.tryToReadAuthData(request, response)
        if (isItOk === true) {
            return "it's ok, can do request"
        } else {
            this.response.redirect(this.eveAuthService.authRedirect);
        }
    }

    async tryToReadAuthData(@Req() request: Request, @Res() response: Response): Promise<boolean> {

        this.response = response;
        this.eveAuthService.userObject.characterId = request.cookies['characterId']
        this.eveAuthService.userObject.characterName = request.cookies['characterName']
        this.eveAuthService.userObject.tokenScopes = request.cookies['tokenScopes']
        this.eveAuthService.userObject.accessToken = request.cookies['accessToken']
        this.eveAuthService.userObject.expiresIn = request.cookies['expiresIn']
        this.eveAuthService.userObject.refreshToken = request.cookies['refreshToken']

        if (typeof this.eveAuthService.userObject.accessToken == 'undefined') {
            return false
        }
        if (Date.now() / 1000 > this.eveAuthService.userObject.expiresIn) {
            await this.eveAuthService.refreshAccessToken()
            await this.eveAuthService.storeState(response)
            return true
        } else {
            return true
        }
    }

    @Get('callback')
    async callback(@Query('code') code: string, @Query('state') state: string, @Res({ passthrough: true }) response: Response) {

        if (code && state == this.eveAuthService.state) {
            let authResult = await this.eveAuthService.workWithCodeAndState(code)
            if (authResult === true) {
                this.eveAuthService.storeState(response)
                return this.eveAuthService.userObject
            } else {
                return 'auth failed, please try again ' + authResult.toString() + ' <a href="' + this.eveAuthService.authRedirect.toString() + '">Link</a>'
            }
        } else {
            return '(code && state == this.eveAuthService.state) auth failed, please try again <a href="' + this.eveAuthService.authRedirect.toString() + '>Link</a>'
        }

    }

    @Get('refreshToken')
    async refreshToken() {
        if (typeof this.eveAuthService.userObject.accessToken == 'undefined') {
            return 'no access token! Go to auth comЯad'
        }
        if (Date.now() / 1000 > this.eveAuthService.userObject.expiresIn) {
            await this.eveAuthService.refreshAccessToken()
            return this.eveAuthService.userObject
        } else {
            return this.eveAuthService.userObject
        }

    }

    @Get('cookie')
    cookietest(@Res({ passthrough: true }) response: Response) {
        response.cookie('test', '123')
    }

    @Get('readstate')
    readstate(@Req() request: Request) {
        this.eveAuthService.readState(request);
        return this.eveAuthService.userObject;
    }

    @Get('simplerequest')
    async getCharacterInfo(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        return this.getDataSimpleGetRequest(request, response, this.eveAuthService.baseUrl + 'characters/{CHARACTERID}/?datasource=tranquility&token={ACCESSTOKEN}', this.defaultPatterns);
    }

    async getDataSimpleGetRequest(@Req() request: Request, @Res({ passthrough: true }) response: Response, url: string, patterns) {
        if (await this.tryToReadAuthData(request, response) == true) {

            for (var key in patterns) {
                url = url.replace(patterns[key][1], this.eveAuthService.userObject[patterns[key][0]])
            }

            // here is the request URL to take data from eve api
            console.log(url)

        } else {
            return false;
        }
    }
}
