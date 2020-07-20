/**
 * @desc baokim支付
 */

import Jwt from 'jwt-simple';
import request from 'request-promise';

module.exports = class baoKimPay {
    // 初始化
    constructor(initData = {}) {
        let { apiKey, apiSecret, tokenExpire, encodeAlg, isDev } = initData;
        this.apiKey = apiKey;                           // api账户
        this.apiSecret = apiSecret;                     // api密钥
        this.tokenExpire = tokenExpire || 60;           // token最大有效期 默认 60s
        this.encodeAlg = encodeAlg || 'HS256';          // 加密方式 默认 HS256
        this.jwt = '';                                  // 当次请求的jwt
        this.isDev = isDev || false;                     // 是否是dev模式
        // 请求域名
        this.devHost = "https://sandbox-api.baokim.vn/payment/";
        this.proHost = "https://api.baokim.vn/payment/";
        this.urlList = {
            // 获取银行api
            bankApi: "api/v4/bank/list",
            // 获取银行支付api
            bankPayApi: "api/v4/bpm/list",
        };
        // 银行api列表
        this.bankApiList = [];
        // 银行支付api列表
        this.bankPayApiList = [];
    }

    // 生成随机字符串
    randomString(e) {
        e = e || 32;
        let t = "0123456789qazwsxedcrfvtgbyhnujmikolpQAZWSXEDCRFVTGBYHNUJMIKOLP",
            a = t.length,
            n = "";
        for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
        return n;
    }

    // 获取令牌id
    getTokenId() {
        let randomString = this.randomString(32);
        return Buffer.from(randomString).toString('base64');
    }

    // 刷新token
    refreshToken(formParams = {}) {
        let tokenId = this.getTokenId();                            // 令牌id
        let issuedAt = Math.floor(new Date() / 1000);      // 
        let notBefore = issuedAt;
        let expire = Number(notBefore) + Number(this.tokenExpire);
        /**
         * Payload data of the token
         */
        let data = {
            iat: issuedAt,              // Issued at: time when the token was generated
            jti: tokenId,               // Json Token Id: an unique identifier for the token
            iss: this.apiKey,           // Issuer
            nbf: notBefore,             // Not before
            exp: expire,                // Expire
            form_params: formParams     // request body (post data)
        }
        /**
         * Encode the array to a JWT string.
         * Second parameter is the key to encode the token.
         * The output string can be validated at http://jwt.io/
         */
        this.jwt = Jwt.encode(data, this.apiSecret);
        return this.jwt;
    }

    // 获取token
    getToken(initData = {}) {
        let { apiKey, apiSecret, tokenExpire, encodeAlg, isDev, formParams = {} } = initData;
        // init
        if (apiKey) this.apiKey = apiKey;
        if (apiSecret) this.apiSecret = apiSecret;
        if (tokenExpire) this.tokenExpire = tokenExpire;
        if (encodeAlg) this.encodeAlg = encodeAlg;
        if (isDev) this.isDev = isDev;
        // 必要参数
        if (!this.apiKey) throw new Error("apiKey is not exists");
        if (!this.apiSecret) throw new Error("apiSecret is not exists");
        if (!this.jwt) this.refreshToken(formParams);
        try {
            Jwt.decode(this.jwt, this.apiSecret);
        } catch (e) {
            console.log(e);
            this.refreshToken(formParams);
        }
        return this.jwt;
    }

    // 获取银行api列表
    async getBankApiList(initData = {}) {
        let jwt = this.getToken();
        let { lbAvailable, offset, limit } = initData;
        // 设置请求body
        let reqBody = { jwt };
        if (lbAvailable) {
            reqBody.lb_available = 1;
        } else {
            reqBody.lb_available = 0;
        }
        if (offset) reqBody.offset = offset;
        if (limit) reqBody.limit = limit;
        // 请求配置
        const opt = {
            method: 'GET',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.bankApi,
            qs: reqBody,
            headers: {
                'Content-Type': 'application/json',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // 请求
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        this.bankApiList = body.body;
        return this.bankApiList;
    }

    // 获取银行支付api列表
    async getBankPayApiList() {
        let jwt = this.getToken();
        // 设置请求body
        let reqBody = { jwt };
        // 请求配置
        const opt = {
            method: 'GET',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.bankPayApi,
            qs: reqBody,
            headers: {
                'Content-Type': 'application/json',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // 请求
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        this.bankPayApiList = body.body;
        return this.bankPayApiList;
    }



};