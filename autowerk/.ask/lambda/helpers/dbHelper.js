var AWS = require("aws-sdk");
AWS.config.update({region: "eu-central-1"}); 
const tableName = "autoWerkDb";

var dbHelper = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();

dbHelper.prototype.addToolDemand = (typesOfTools,  userID, diameter, machines, arrivalTime, manufactureStep,manufactureOrder, demandReason, TransportDemandsId ) => { //
    return new Promise((resolve, reject) => {
        
        const params = {
            TableName: tableName,
            Item: {
              'userId' : userID, // 'NAMEinDB' : NameinIndes.js,
              'TransportDemandsId': TransportDemandsId,
              'typesOfTools': typesOfTools,
              'diameter': diameter,
              'machines': machines,
              'arrivalTime': arrivalTime,
              'manufactureStep': manufactureStep,
              'manufactureOrder': manufactureOrder,
              'demandReason': demandReason
            }
        };
        docClient.put(params, (err, data) => {
            if (err) {
                console.log("Unable to insert =>", JSON.stringify(err))
                return reject("Unable to insert");
            }
            console.log("Saved Data, ", JSON.stringify(data));
            resolve(data);
        });
    });
}

dbHelper.prototype.getTransportDemand = (userID, transportDemandId) => { //, transportDemandId
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            KeyConditionExpression: "#userID = :user_id and #transportDemandId = :transportDemand_id",
            //ProjectionExpression: "#userID, TransportDemandsId",
            ExpressionAttributeNames: {
                "#userID": "userId",
                "#transportDemandId": "TransportDemandsId"
            },
            ExpressionAttributeValues: {
                ":user_id": userID,
                ":transportDemand_id": parseInt(transportDemandId) //von String zu Integer umwandeln
            },
        };
        docClient.query(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.getTransportDemandID = (userID) => { //, transportDemandId
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            KeyConditionExpression: "#userID = :user_id",
            //ProjectionExpression: "#userID, TransportDemandsId",
            ExpressionAttributeNames: {
                "#userID": "userId"
            },
            ExpressionAttributeValues: {
                ":user_id": userID
            },
        };
        docClient.query(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}


dbHelper.prototype.scanTransportDemand = (typesOfTools, machines, diameter) => { //, transportDemandId, typesOfTools, machines, diameter
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            //KeyConditionExpression: "#userID = :user_id",
            ProjectionExpression: "TransportDemandsId, arrivalTime, machines, diameter, typesOfTools, manufactureStep, manufactureOrder",
            FilterExpression: "(contains (typesOfTools, :typesOfTools)) and (contains (machines, :machines)) and (contains (diameter, :diameter))", // and (contains (diameter, :diameter))
            /*ExpressionAttributeNames: {
                "#userID": "userId"
                //"#transportDemandId": "TransportDemandsId"
            },*/
            ExpressionAttributeValues: {
                //":user_id": userID,
                ":typesOfTools": typesOfTools,
                ":machines": machines,
               ":diameter": diameter
                //":transportDemand_id": parseInt(transportDemandId) //von String zu Integer umwandeln
            },
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.scanDeleteDemand = (typesOfTools, machines, diameter, manufactureOrder, arrivalTime) => { //, transportDemandId, typesOfTools, machines, diameter
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            //KeyConditionExpression: "#userID = :user_id",
            ProjectionExpression: "TransportDemandsId, arrivalTime, machines, diameter, typesOfTools, manufactureStep, manufactureOrder",
            FilterExpression: "(contains (typesOfTools, :typesOfTools)) and (contains (machines, :machines)) and (contains (diameter, :diameter)) and (contains (manufactureOrder, :manufactureOrder)) and (contains (arrivalTime, :arrivalTime))", // and (contains (diameter, :diameter))
            /*ExpressionAttributeNames: {
                "#userID": "userId"
                //"#transportDemandId": "TransportDemandsId"
            },*/
            ExpressionAttributeValues: {
                //":user_id": userID,
                ":typesOfTools": typesOfTools,
                ":machines": machines,
               ":diameter": diameter,
               ":manufactureOrder": manufactureOrder,
               //":manufactureStep": manufactureStep,
               ":arrivalTime": arrivalTime
                //":transportDemand_id": parseInt(transportDemandId) //von String zu Integer umwandeln
            },
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.scanDeleteTimeDemand = (typesOfTools, machines, diameter, arrivalTime) => { //, transportDemandId, typesOfTools, machines, diameter
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            //KeyConditionExpression: "#userID = :user_id",
            ProjectionExpression: "TransportDemandsId, arrivalTime, machines, diameter, typesOfTools, manufactureStep, manufactureOrder",
            FilterExpression: "(contains (typesOfTools, :typesOfTools)) and (contains (machines, :machines)) and (contains (diameter, :diameter))  and (contains (arrivalTime, :arrivalTime))", // and (contains (diameter, :diameter))
            /*ExpressionAttributeNames: {
                "#userID": "userId"
                //"#transportDemandId": "TransportDemandsId"
            },*/
            ExpressionAttributeValues: {
                //":user_id": userID,
                ":typesOfTools": typesOfTools,
                ":machines": machines,
               ":diameter": diameter,
               //":manufactureStep": manufactureStep,
               ":arrivalTime": arrivalTime
                //":transportDemand_id": parseInt(transportDemandId) //von String zu Integer umwandeln
            },
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.scanDeleteOrderDemand = (typesOfTools, machines, diameter, manufactureOrder) => { //, transportDemandId, typesOfTools, machines, diameter
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            //KeyConditionExpression: "#userID = :user_id",
            ProjectionExpression: "TransportDemandsId, arrivalTime, machines, diameter, typesOfTools, manufactureStep, manufactureOrder",
            FilterExpression: "(contains (typesOfTools, :typesOfTools)) and (contains (machines, :machines)) and (contains (diameter, :diameter)) and (contains (manufactureOrder, :manufactureOrder))", // and (contains (diameter, :diameter))
            /*ExpressionAttributeNames: {
                "#userID": "userId"
                //"#transportDemandId": "TransportDemandsId"
            },*/
            ExpressionAttributeValues: {
                //":user_id": userID,
                ":typesOfTools": typesOfTools,
                ":machines": machines,
               ":diameter": diameter,
               ":manufactureOrder": manufactureOrder
                //":transportDemand_id": parseInt(transportDemandId) //von String zu Integer umwandeln
            },
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}



dbHelper.prototype.scanDateWhole = (readDateWhole)  => { //, transportDemandId, typesOfTools, machines, diameter
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            //KeyConditionExpression: "#userID = :user_id",
            ProjectionExpression: "TransportDemandsId, arrivalTime, machines, diameter, typesOfTools, manufactureStep, manufactureOrder",
            FilterExpression: "contains (arrivalTime, :arrivalTime)", // and (contains (diameter, :diameter))
            /*ExpressionAttributeNames: {
                "#userID": "userId"
                //"#transportDemandId": "TransportDemandsId"
            },*/
            ExpressionAttributeValues: {
                //":user_id": userID,
                ":arrivalTime": readDateWhole
                //":transportDemand_id": parseInt(transportDemandId) //von String zu Integer umwandeln
            },
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.scanTimeDate = (readDateTimeStart, readDateTimeEnd)  => { //, transportDemandId, typesOfTools, machines, diameter
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            //KeyConditionExpression: "#userID = :user_id",
            ProjectionExpression: "TransportDemandsId, arrivalTime, machines, diameter, typesOfTools, manufactureStep, manufactureOrder",
            FilterExpression: "arrivalTime between :dateTimeStart and :dateTimeEnd", // and (contains (diameter, :diameter))
            /*ExpressionAttributeNames: {
                "#userID": "userId"
                //"#transportDemandId": "TransportDemandsId"
            },*/
            ExpressionAttributeValues: {
                //":user_id": userID,
                ":dateTimeStart": readDateTimeStart,
                ":dateTimeEnd": readDateTimeEnd
                //":transportDemand_id": parseInt(transportDemandId) //von String zu Integer umwandeln
            },
        };
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}


dbHelper.prototype.removeDemand = (userID, transportDemandId) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: {
                "userId": userID,
                "TransportDemandsId": parseInt(transportDemandId) 
            },
            ConditionExpression: "attribute_exists(TransportDemandsId)",
            ReturnValues: "ALL_OLD" //Gibt die werte zurück
        }
        docClient.delete(params, function (err, data) {
            if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            }
            console.log(JSON.stringify(err));
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            resolve()
        })
    });
}

module.exports = new dbHelper();