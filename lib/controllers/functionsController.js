"use strict";

exports.create = function createUsers(req, res, container) {

    var data = req.data;

    // PK 체크
    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {name : data.name}}}, function(err, doc) {

            if(err)
                return res.error(err);

            if(doc.data) {

                return res.error(409, new Error("Duplicated unique property error"));
            }

            data._className = '_Functions';

            service.send('insert', {collectionName : req.session.appid, data : data}, function(err, doc) {

                if(err)
                    return res.error(err);

                res.send(201, {
                    createdAt : doc.data.createdAt,
                    objectId : doc.data.objectId
                });
            });
        });


    }).fail(function(err) {

        res.error(err);
    });
};

exports.read = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {_className : '_Functions', objectId : req.params._objectId}}}, function(err, doc) {

            if(err)
                return res.error(err);

            res.send(200, doc.data);
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.update = function(req, res, container) {

    var data = req.data;

    if(!data)
        return res.error(new Error('RequestBodyNotFound'));

    container.getService('MONGODB').then(function(service) {

        service.send('update', {collectionName : req.session.appid, query : {where : {_className : '_Functions', objectId : req.params._objectId}}, data : data}, function(err, doc) {

            if(err) {

                if(err.code === 10147)
                    return new Error(404, 'ResourceNotFound');

                return res.error(err);
            }

            res.send(200, {
                updatedAt : doc.data.updatedAt
            });

        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.find = function(req, res, container) {

    container.getService('MONGODB').then(function (service) {

        req.query.where._className = '_Functions';

        service.send('find', {collectionName : req.session.appid, query: req.query}, function (err, docs) {

            if (err)
                return res.error(err);

            for(var i= 0, cnt= docs.length; i<cnt; i++) {

                delete docs[i].password;
                delete docs[i].sessionToken;
            }

            if (typeof(docs.data) === 'number') {

                res.send(200, {results: [], count: docs.data});
            } else {

                res.send(200, {results: docs.data});
            }
        });
    }).fail(function (err) {

        res.error(err);
    });
};

exports.destroy = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('remove', {collectionName : req.session.appid, query : {where : {_className : '_Functions', objectId : req.params._objectId}}}, function(err, doc) {

            if(err)
                return res.error(err);

            res.send(200, {});
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.destroyAll = function(req, res, container) {

    // 테스트에서만 사용
    if(process.env.NODE_ENV !== 'test') {

        return res.error(new Error("cannot access"));
    }

    container.getService('MONGODB').then(function(service) {

        service.send('remove', {collectionName : req.session.appid, query : {_className : '_Functions'}}, function(err, doc) {

            if(err)
                return res.error(err);

            res.send(200, {});
        });
    }).fail(function(err) {

        res.error(err);
    });
};


exports.run = function(req, res, container) {

    var functionName = req.params._objectId;

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {_className : '_Functions', name : functionName}}}, function(err, doc) {

            if(err)
                return res.error(err);

            try {
                var Noserv = require('noserv').Noserv;

                NoservInit.put(req.session.applicationId, req.session.javascriptKey);

                var f = new Function('req', 'res', doc.data.function);

                f(req, res);
                //res.send(200, doc.data);
            } catch(e) {

                res.error(e);
            }
        });
    }).fail(function(err) {

        res.error(err);
    });
};