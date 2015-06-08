"use strict";

exports.getTriggerList = function(req, container, callback) {

    container.getService('MONGODB').then(function (service) {

        service.send('find', {
            collectionName : req.appid,
            query: {
                where : {
                    triggerTypes : req._className + '_' + req.triggerType,
                    _className : '_Functions'
                }
            }
        }, function (err, docs) {

            if (err)
                return callback(err, null);

            callback(err, docs.data);
        });
    }).fail(function (err) {

        callback(err, null);
    });
};

exports.getAppInfo = function(appid, container, callback) {

    if(appid === 'test') {
        return callback( null, {
            applicationId: 'test',
            javascriptKey: 'supertoken',
            masterKey: 'supertoken'
        });
    }

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : 'apps', query : {where : {objectId : appid}}}, function(err, doc) {

            if(err)
                return callback(err, null);

            callback(err, doc.data);
        });
    }).fail(function(err) {

        callback(err, null);
    });
};

exports.getUserInfo = function(appid, userid, container, callback) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : appid, query : {where : {objectId : userid}}}, function(err, doc) {

            if(err)
                return callback(err, null);

            if(doc.data) {

                delete doc.data.password;
                delete doc.data.sessionToken;
            }

            callback(err, doc.data);
        });
    }).fail(function(err) {

        return callback(err, null);
    });
};

exports.getClassName = function(parameter) {

    if(!parameter)
        return null;

    var className = null;

    if(parameter.query && parameter.query._className)
        className = parameter.query._className;

    else if(parameter.query && parameter.query.where && parameter.query.where._className)
        className = parameter.query.where._className;

    else if(parameter.data && parameter.data._className)
        className = parameter.data._className;

    else if(parameter.group && parameter.group.cond && parameter.group.cond._className)
        className = parameter.group.cond._className;

    else if(parameter.aggregate && parameter.aggregate[0].$match && parameter.aggregate[0].$match._className)
        className = parameter.aggregate[0].$match._className;

    // prevent bubbling
    if(className === '_Functions')
        className = null;

    return className;
};

exports.getUserId = function(parameter) {

    if(!parameter)
        return null;

    if(parameter.query && parameter.query.where && parameter.query.where._userid)
        return parameter.query.where._userid;

    if(parameter.data && parameter.data._userid)
        return parameter.data._userid;

    if(parameter.group && parameter.group.cond && parameter.group.cond._userid)
        return parameter.group.cond._userid;

    if(parameter.aggregate && parameter.aggregate[0].$match && parameter.aggregate[0].$match._userid)
        return parameter.aggregate[0].$match._userid;

    return null;
};
