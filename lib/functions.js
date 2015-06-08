"use strict";

var _ = require('lodash');
var controller = require('./controllers/functionsController');

exports.container = null;

exports.init = function(container, callback) {

    exports.container = container;

    container.addListener('request', onRequest);
    container.addListener('run', onRun);

    callback(null);
};

exports.close = function(callback) {

    callback(null);
};

exports.request = onRequest;


function onRequest(req, res) {

    if(req.data.params._query1)
        req.data.params._objectId = req.data.params._query1;

    var checklist = ['APIAUTH'];

    var dest = getRouteDestination(req.data);

    if(!dest) {

        return res.error(new Error('ResourceNotFound'))
    }

    exports.container.getService('AUTH').then(function(service) {

        var reqData = {checklist : checklist};

        var deep = function(a, b) {
            return _.isObject(a) && _.isObject(b) ? _.assign(a, b, deep) : b;
        };

        service.send('check', _.assign(reqData, req.data, deep), function(err, response) {

            if(err) {

                return res.error(err);
            }

            setReqFromSession(req.data, response.data.session);

            controller[dest](req.data, res, exports.container);
        });

    }).fail(function(err) {

        res.error(new Error('auth service not found'));
    });
}


function onRun(req, res) {

    if (req.data.triggerType)
        return runTrigger(req, res);

    var data = req.data;
    var param = {

        session: {
            appid: data.appid,
            applicationId: data.applicationId,
            javascriptKey: data.javascriptKey,
            masterKey: data.masterKey
        },
        params: {_objectId: data.functionName},
        data: data.parameter
    };

    controller.run(param, res, exports.container);
}

function runTrigger(req, res) {

    var data = req.data;
    var triggerController = require('./controllers/triggersController');

    var reqData = data.reqData || data.parameter;

    if(!reqData || !reqData.collectionName)
        return res.send({});

    var appid = reqData.collectionName;
    var userid = triggerController.getUserId(reqData);

    req.triggerType = data.triggerType;
    req._className = triggerController.getClassName(reqData);
    req.appid = appid;

    if(!req._className)
        return res.send({});

    if(!appid)
        return res.send({});

    var appInfo = {};
    var userInfo = {};

    var async = require('async');

    async.waterfall([

            function(callback) {

                triggerController.getAppInfo(appid, exports.container, function(err, doc) {

                    if(err)
                        return callback(err, err.message);

                    appInfo = doc;
                    callback(null);
                });
            },
            function(callback) {

                if(!appid || !userid)
                    return callback(null);

                triggerController.getUserInfo(appid, userid, exports.container, function(err, doc) {

                    if(err)
                        return callback(err, err.message);

                    userInfo = doc;
                    callback(null);
                });
            }
        ],
        function(err, result) {

            if(err || _.isEmpty(appInfo))
                return res.send({});

            var param = {

                session: {
                    appid: appid,
                    applicationId: appInfo.applicationId,
                    javascriptKey: appInfo.javascriptKey,
                    masterKey: appInfo.masterKey
                },
                params: {_objectId: ''},
                data: data.parameter
            };

            triggerController.getTriggerList(req, exports.container, function(err, docs) {

                if(!docs || docs.length === 0)
                    return res.send({});

                var runCnt = 0;
                var docCnt = docs.length;

                var queue = async.queue(function(reqChanged, cb) {

                    // arrangement
                    if(reqChanged.query)
                        req.data.parameter.query = reqChanged.query;
                    if(reqChanged.data)
                        req.data.parameter.data = reqChanged.data;
                    if(reqChanged.group)
                        req.data.parameter.group = reqChanged.group;
                    if(reqChanged.aggregate)
                        req.data.parameter.aggregate = reqChanged.aggregate;

                    cb();
                }, 1);

                queue.drain = function() {

                    if(runCnt === docCnt)
                        res.send(req.data.parameter);
                };

                for(var i= 0, cnt=docCnt; i<cnt; i++) {

                    var doc = docs[i];

                    param.params._objectId = doc.name;

                    var response = {

                        send : function(reqChanged) {

                            queue.push(reqChanged, function(err) {});

                        },
                        error : function(err) {

                            queue.push({}, function(err) {});
                        }
                    };

                    runCnt ++;
                    controller.run(param, response, exports.container);
                }
            });
        }
    );
}

function setReqFromSession(reqData, session) {

    reqData.session = session;

    if(session.userid) {

        reqData.query.where._userid = session.userid;

        if(reqData.data)
            reqData.data._userid = session.userid;
    }

    if(session.appid) {

        reqData.query.where._appid = session.appid;

        if(reqData.data)
            reqData.data._appid = session.appid;
    }
}

function getRouteDestination(reqData) {

    var dest = '';

    switch(reqData.method) {

        case 'GET' :
            if(reqData.params._objectId)
                dest = 'read';
            else
                dest = 'find';
            break;

        case 'POST' :
            if(reqData.params._objectId)
                dest = 'run';
            else
                dest = 'create';
            break;

        case 'PUT' :
            dest = 'update';
            break;

        case 'DELETE' :
            if(reqData.params._objectId)
                dest = 'destroy';
            else
                dest = 'destroyAll';
            break;
    }

    return dest;
}
