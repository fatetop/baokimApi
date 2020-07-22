/**
 * @desc baokim pay api
 */

import Jwt from 'jwt-simple';
import request from 'request-promise';

module.exports = class baoKimPay {
    /**
     * @desc init
     * @param {string} apiKey api account
     * @param {string} apiSecret api secret
     * @param {int} tokenExpire The maximum validity period of token is 60s by default
     * @param {string} encodeAlg Encryption method default HS256
     * @param {boolean} isDev Whether it is dev mode
     */
    constructor(initData = {}) {
        let { apiKey, apiSecret, tokenExpire, encodeAlg, isDev } = initData;
        this.apiKey = apiKey;                           // api account
        this.apiSecret = apiSecret;                     // api secret
        this.tokenExpire = tokenExpire || 60;           // The maximum validity period of token is 60s by default
        this.encodeAlg = encodeAlg || 'HS256';          // Encryption method default HS256
        this.jwt = '';                                  // Jwt of the current request
        this.isDev = isDev || false;                    // Whether it is dev mode
        // request host
        this.devHost = "https://sandbox-api.baokim.vn/payment/";
        this.proHost = "https://api.baokim.vn/payment/";
        this.urlList = {
            // get bank api
            bankApi: "api/v4/bank/list",
            // get bank pay api
            bankPayApi: "api/v4/bpm/list",
            // send order api
            sendOrderApi: "api/v4/order/send",
            // order detail api
            orderDetailApi: "api/v4/order/detail",
            // order list detail api
            orderListDetailApi: "api/v4/order/list",
            // cancel order api
            cancelOrderApi: "api/v4/order/cancel"
        };
        // bank api list
        this.bankApiList = {};
        // bank pay api list
        this.bankPayApiList = {};
        // send order api results
        this.sendOrderRes = {};
        // order detail api results
        this.orderDetailRes = {};
        // order detail list api results
        this.orderListDetailRes = {};
        // cancel order api results
        this.cancelOrderRes = {};
    }

    /**
     * @param {int} e Specify length, default 32
     * @returns Generate random string of specified length
     */
    randomString(e) {
        e = e || 32;
        let t = "0123456789qazwsxedcrfvtgbyhnujmikolpQAZWSXEDCRFVTGBYHNUJMIKOLP",
            a = t.length,
            n = "";
        for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
        return n;
    }

    /**
     * @returns get token id
     */
    getTokenId() {
        let randomString = this.randomString(32);
        return Buffer.from(randomString).toString('base64');
    }

    /**
     * @param {object} formParams post body params
     * @returns refresh token
     */
    refreshToken(formParams = {}) {
        let tokenId = this.getTokenId();                            // token id
        let issuedAt = Math.floor(new Date() / 1000);
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

    /**
     * @param {string} apiKey api account
     * @param {string} apiSecret api secret
     * @param {int} tokenExpire The maximum validity period of token is 60s by default
     * @param {string} encodeAlg Encryption method default HS256
     * @param {boolean} isDev Whether it is dev mode
     * @param {object} formParams post body params
     * @returns get token
     */
    getToken(initData = {}) {
        let { apiKey, apiSecret, tokenExpire, encodeAlg, isDev, formParams = {} } = initData;
        // init
        if (apiKey) this.apiKey = apiKey;
        if (apiSecret) this.apiSecret = apiSecret;
        if (tokenExpire) this.tokenExpire = tokenExpire;
        if (encodeAlg) this.encodeAlg = encodeAlg;
        if (isDev) this.isDev = isDev;
        // required params
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

    /**
     * @param {int} lbAvailable Search by bank list that supports wallet links (1: support, 0: no support)
     * @param {int} offset Get the word record
     * @param {int} limit Maximum number of records
     * @returns List of supported Kim Bao banks, Web / App merchant can use this API to display the list of Banks on its application.
     */
    async getBankApiList(initData = {}) {
        let jwt = this.getToken();
        let { lbAvailable, offset, limit } = initData;
        // set request params
        let reqQs = { jwt };
        if (lbAvailable == 0) reqQs.lb_available = lbAvailable;
        if (lbAvailable == 1) reqQs.lb_available = lbAvailable;
        if (offset) reqQs.offset = offset;
        if (limit) reqQs.limit = limit;
        // request
        const opt = {
            method: 'GET',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.bankApi,
            qs: reqQs,
            headers: {
                'Content-Type': 'application/json',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // request results
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        // set results
        this.bankApiList = body.body;
        return this.bankApiList;
    }

    /**
     * @returns List of payment methods supported by Bao Kim banks, Web / App merchant can use this API to display payment methods on their applications This list is classified by "type" field as follows: : 
     * @options type = 0: payment from Bao Kim wallet
     * @options type = 1: online ATM card banks
     * @options type = 2: visa/master card
     * @options type = 14: QR code
     * @options type = 15: payment by E-Wallet
     */
    async getBankPayApiList() {
        // get jwt token
        let jwt = this.getToken();
        // set request params
        let reqQs = { jwt };
        // request
        const opt = {
            method: 'GET',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.bankPayApi,
            qs: reqQs,
            headers: {
                'Content-Type': 'application/json',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // request results
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        // set results
        this.bankPayApiList = body.body;
        return this.bankPayApiList;
    }

    /**
     * @param {string} mrcOrderId merchant's order code
     * @param {int} totalAmount The total amount of the order
     * @param {string} description Transaction description
     * @param {string} urlSuccess Url redirect again after successful payment
     * @param {int} merchantId website id code From website validation
     * @param {string} urlDetail Line item url (redirects again when the customer cancels order)
     * @param {string} lang Language (en / vi)
     * @param {int} bpmId Payment method ID from bank From API Bank Payment Method List
     * @param {int} acceptBank Accept payment by ATM card? (Accept: 1, Not accept: 0, default: 1)
     * @param {int} acceptCc Accept payment by Credit Card? (Accept: 1, Not accept: 0, default: 1)
     * @param {int} acceptQrpay Accept payment by QR code? (Accept: 1, Not acceptable: 0, default: 0)
     * @param {string} webhooks url used to send notifications for sales website, chat, ... when the order is successful, allows notify to multiple urls, separated by
     * @param {string} customerEmail Email client
     * @param {string} customerPhone Customer's phone number
     * @param {string} customerName Customer's full name
     * @param {string} customerAddress Customer address
     * @returns [API Sending order information from user's application to Bao Kim to make payment.]
     */
    async sendOrder(initData = {}) {
        let {
            mrcOrderId, totalAmount, description, urlSuccess, merchantId, urlDetail, lang, bpmId, acceptBank,
            acceptCc, acceptQrpay, webhooks, customerEmail, customerPhone, customerName, customerAddress
        } = initData;
        // required params
        if (!mrcOrderId) throw new Error("mrcOrderId is not exists");
        if (!totalAmount) throw new Error("totalAmount is not exists");
        if (!description) throw new Error("description is not exists");
        if (!urlSuccess) throw new Error("urlSuccess is not exists");
        // post params
        let formParams = {
            mrc_order_id: mrcOrderId,
            total_amount: totalAmount,
            description,
            url_success: urlSuccess,
        }
        if (merchantId) formParams.merchant_id = merchantId;
        if (urlDetail) formParams.url_detail = urlDetail;
        if (lang) formParams.lang = lang;
        if (bpmId) formParams.bpm_id = bpmId;
        if (acceptBank == 1) formParams.accept_bank = acceptBank;
        if (acceptBank == 0) formParams.accept_bank = acceptBank;
        if (acceptCc == 1) formParams.accept_cc = acceptCc;
        if (acceptCc == 0) formParams.accept_cc = acceptCc;
        if (acceptQrpay == 1) formParams.accept_qrpay = acceptQrpay;
        if (acceptQrpay == 0) formParams.accept_qrpay = acceptQrpay;
        if (webhooks) formParams.webhooks = webhooks;
        if (customerEmail) formParams.customer_email = customerEmail;
        if (customerPhone) formParams.customer_phone = customerPhone;
        if (customerName) formParams.customer_name = customerName;
        if (customerAddress) formParams.customer_address = customerAddress;
        // get jwt token
        let jwt = this.getToken({ formParams });
        // set request params
        let reqQs = { jwt };
        let reqBody = formParams;
        // request
        const opt = {
            method: 'POST',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.sendOrderApi,
            qs: reqQs,
            form: reqBody,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // request results
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        // set results
        this.sendOrderRes = body.body;
        return this.sendOrderRes;
    }

    /**
     * @param {string} id order id
     * @param {string} mrcOrderId merchant's order code
     * @returns API Get order information details, can be used to check the status of order payment.
     */
    async orderDetail(initData = {}) {
        let { mrcOrderId, id } = initData;
        // required params
        if ((!mrcOrderId) && (!id)) throw new Error("Choose one of mrcOrderId and id");
        // get jwt token
        let jwt = this.getToken();
        // set request params
        let reqQs = { jwt };
        if (mrcOrderId) reqQs.mrc_order_id = mrcOrderId;
        if (id) reqQs.id = id;
        // request
        const opt = {
            method: 'GET',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.orderDetailApi,
            qs: reqQs,
            headers: {
                'Content-Type': 'application/json',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // request results
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        // set results
        this.orderDetailRes = body.body;
        return this.orderDetailRes;
    }

    /**
     * @param {string} mrcOrderId merchant's order code
     * @param {string} txnId Trading code
     * @param {string} stat order status
     * @param {string} fromDate order from the day
     * @param {string} toDate order arrival date
     * @param {int} perPage Total number of lines per page
     * @param {int} page The page index to retrieve
     * @returns API Get list of user orders, can be used to match orders between applications and Bao Kim.
     */
    async orderListDetail(initData = {}) {
        let { mrcOrderId, txnId, stat, fromDate, toDate, perPage, page } = initData;
        // get jwt token
        let jwt = this.getToken();
        // set request params
        let reqQs = { jwt };
        if (mrcOrderId) reqQs.mrc_order_id = mrcOrderId;
        if (txnId) reqQs.txn_id = txnId;
        if (stat) reqQs.stat = stat;
        if (fromDate) reqQs.from_date = fromDate;
        if (toDate) reqQs.to_date = toDate;
        if (perPage) reqQs.per_page = perPage;
        if (page) reqQs.page = page;
        // request
        const opt = {
            method: 'GET',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.orderListDetailApi,
            qs: reqQs,
            headers: {
                'Content-Type': 'application/json',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // request results
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        // set results
        this.orderListDetailRes = body.body;
        return this.orderListDetailRes;
    }

    /**
     * @param {int} id order id 
     * @returns Order cancellation API, use in case you no longer want to receive payment for your order
     */
    async cancelOrder(initData = {}) {
        let { id } = initData;
        // required params
        if (!id) throw new Error("id is not exists");
        let formParams = { id };
        // get jwt token
        let jwt = this.getToken({ formParams });
        // set request params
        let reqQs = { jwt };
        let reqBody = formParams;
        // request
        const opt = {
            method: 'POST',
            url: (this.isDev ? this.devHost : this.proHost) + this.urlList.cancelOrderApi,
            qs: reqQs,
            form: reqBody,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            json: true,
            timeout: 1000 * 30,
            transform: function (body, response, resolveWithFullResponse) {
                return response
            }
        };
        // request results
        let body = await request(opt).catch(err => {
            return think.isError(err) ? err : new Error(err)
        });
        if (body.statusCode != 200) {
            throw new Error(`${body.name}: ${body.message}`);
        }
        // set results
        this.cancelOrderRes = body.body;
        return this.cancelOrderRes;
    }

};