// sets up dependencies
"use strict";
const Alexa = require('ask-sdk');
const dbHelper = require('./helpers/dbHelper.js');
const dynamoDBTableName = "autoWerkDb";

//var http = require('http');  
//var https = require('https');  // HTTP Calls initialisieren  "const request = require('request');" wird nicht mehr unterstützt

const {
  getRequestType,
  getIntentName,
  //getSlotValue,
  //getDialogState,
} = require('ask-sdk');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput){
     const speakOutput = 'Willkommen zu AutoWerk. Ich helfe dir Werkzeuge anzufordern und Bestellungen zu löschen. Sowie Informationen zu den Robotern und Werkzeugbestellungen abzufragen.';
     const speakReprompt = 'Welche Aktivität möchtest du tätigen?';
     
   return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakReprompt)
      .getResponse();  
  }
};

const CreateToolDemandHandler = {
  canHandle(handlerInput){
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'CreateToolDemandIntent'
    && 
    handlerInput.requestEnvelope.request.intent.confirmationStatus !==  "DENIED";  
  },
  async handle(handlerInput){
  const currentIntent = handlerInput.requestEnvelope.request.intent.confirmationStatus; 
  const {responseBuilder } = handlerInput; //dynamoDB

    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const typesOfTools = slots.werkzeugtyp.value;
    const machines = slots.maschine.value;
    const diameter = slots.durchmesser.value;
    let timeStart = slots.sollStartzeit.value;
    const dateStart = slots.sollDatum.value;
    const dateStartPicker = new Date (handlerInput.requestEnvelope.request.timestamp);
    let manufactureStep = slots.fertigungsschritt.value;
    const demandReason = slots.grund.value;
    let manufactureOrder = slots.fertigungsauftrag.value;

    let check = isNaN(parseInt(manufactureStep));
   
    if (check === false){
        manufactureOrder = manufactureStep
        manufactureStep = undefined
    }

    if (timeStart.length <= 5 ) {
        timeStart = timeStart + ':00';
    }

    if (dateStart !== undefined){
      var arrivalTime = dateStart + ' ' + timeStart;
    } else {
      var arrivalTime = dateStartPicker.getFullYear() + '-' + ('0' + (dateStartPicker.getMonth()+1)).slice(-2) +'-' + ('0' + dateStartPicker.getDate()).slice(-2)  +  ' ' + timeStart;   
    }

    let TransportDemandsId ;
  
    return  dbHelper.getTransportDemandID(userID)
      .then((data)=>{     
                
      let idsArray = data.map(e => e.TransportDemandsId) //letzte Id des transportauftrags ausgeben und eins nach oben zählen
          idsArray.sort(function(a,b){return a - b});
          TransportDemandsId = idsArray.pop() + 1;

              if (currentIntent !== 'CONFIRMED'){
                const speakOutputFailed = 'Wiederhole bitte deine Angaben';
                return handlerInput.responseBuilder
                  .speak(speakOutputFailed)
                  .reprompt()  //dadurch braucht der skill nicht mehr mit dem invocation name aufgerufen werden aber es ist möglich in ein neues intent zu springen
                  .getResponse();
              } else {
              
                return dbHelper.addToolDemand(typesOfTools, userID, diameter, machines, arrivalTime, manufactureStep, manufactureOrder, demandReason, TransportDemandsId )
                  .then((data) => {
                        
                    const speakOutputSuccess = `Transportauftrag ${TransportDemandsId} erfolgreich angelegt.`;
                    return responseBuilder
                      .speak(speakOutputSuccess)
                      .reprompt()
                      .getResponse();
                })
                .catch((err) => {
                  console.log("Ein fehler erfolgte beim speichern der Daten", err);
                  const speechText = "Wir können die Daten aktuell nicht speichern. Versuche es noch einmal!"
                  return responseBuilder
                    .speak(speechText)
                    .getResponse();
                })
              }
      }) 
                    
      .catch((err) => {
        console.log("Transportauftrags ID konnte nicht gefunden werden. Versuche es nochmal!", err);
        const speechText = "Transportauftrags ID konnte nicht gefunden werden. Versuche es nochmal!"
              return responseBuilder
                .speak(speechText)
                .getResponse();
      })
    }
  };
//------------------------------------

const FirstInformationHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'FirstInformationIntent'; 
  },
  handle(handlerInput){
     const speakOutput = 'Du kannst entweder über die ID des Transportauftrags einen einzelnen Auftrag abfragen oder über die Angaben: Werkzeugtyp, Durchmesser, Maschine, Fertigungsauftrag oder Fertigungsschritt informationen einholen. Zudem kannst du Aufträge in einem bestimmten Zeitraum abfragen. Welche Information möchtest du?';
     const speakReprompt = 'Welche Information möchtest du?';
     
   return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakReprompt)
      .getResponse();  
  }
};
//------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------
const ReadTransportDemandHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === "ReadTransportDemandIntent";
  },
  async handle(handlerInput){
    const {responseBuilder } = handlerInput; //dynamoDB
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const transportDemandId = slots.transportauftrag.value;
    const typesOfTools = slots.werkzeugtyp.value;
    const machines = slots.maschine.value;
    const diameter = slots.durchmesser.value;

    let readTimeStart = slots.vonZeit.value;
    let readTimeEnd = slots.bisZeit.value;
    let readDateStart = slots.vonDatum.value;
    let readDateEnd = slots.bisDatum.value;
    const readDateWhole = slots.datum.value;
    const dateStartPicker = new Date (handlerInput.requestEnvelope.request.timestamp);

    if((transportDemandId === undefined || transportDemandId === "?") && typesOfTools !== undefined && machines !== undefined && diameter !== undefined) {          
        return dbHelper.scanTransportDemand(typesOfTools, machines, diameter) // , transportDemandId, typesOfTools, machines, diameter
                  .then((data)=>{

                    if (data.length === 0) {
                      const speechText = `Es gibt keinen Transportauftrag mit den Angaben ${typesOfTools}, ${diameter} Millimeter Durchmesser und ${machines}.`;
                          return responseBuilder
                            .speak(speechText)
                            .reprompt()
                            .getResponse();
                    } else {
                        
                        let speakOutput;
                            speakOutput = `Es gibt ${data.length} passende Transportaufträge. ` + data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools} mit ${e.diameter} Millimeter Durchmesser für Fertigungsauftrag ${e.manufactureOrder} und -schritt ${e.manufactureStep}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                            //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                            return responseBuilder
                              .speak(speakOutput)
                              .reprompt()
                              .getResponse();
                    }
                  })
                  .catch((err) => {
                    console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
                    const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!"
                    return responseBuilder
                      .speak(speechText)
                      .getResponse();
                  })       
    }   

  else if (readDateWhole !== undefined || (readTimeStart !== undefined || readTimeEnd !== undefined) || (readDateStart !== undefined || readDateEnd !== undefined) ) {
            if (readDateWhole !== undefined){
              return dbHelper.scanDateWhole(readDateWhole) // , transportDemandId, typesOfTools, machines, diameter
              .then((data)=>{
                        if (data.length === 0) {
                          const speechText = `Es gibt keinen Transportauftrag an diesem Tag.`;
                              return responseBuilder
                                .speak(speechText)
                                .reprompt()
                                .getResponse();
                        } else {
                                let speakOutput;
                                    speakOutput = data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools} mit ${e.diameter} Millimeter Durchmesser für Fertigungsauftrag ${e.manufactureOrder} und -schritt ${e.manufactureStep}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                                    //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                                    return responseBuilder
                                      .speak(speakOutput)
                                      .reprompt()
                                      .getResponse();     
                        }
                    })
                    .catch((err) => {
                      console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
                      const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!";
                      return responseBuilder
                        .speak(speechText)
                        .getResponse();
                    }) 
                  }
                

            else if (readTimeStart !== undefined && readTimeEnd !== undefined && readDateStart === undefined && readDateEnd === undefined ){
                if (readTimeStart.length <= 5 ) {
                  readTimeStart = readTimeStart + ':00';
                }
                if (readTimeEnd.length <= 5 ) {
                      readTimeEnd = readTimeEnd + ':00';
                }

              let readDateTimeStart = dateStartPicker.getFullYear() + '-' + ('0' + (dateStartPicker.getMonth()+1)).slice(-2) +'-' + ('0' + dateStartPicker.getDate()).slice(-2)  +  ' ' + readTimeStart;
              let readDateTimeEnd = dateStartPicker.getFullYear() + '-' + ('0' + (dateStartPicker.getMonth()+1)).slice(-2) +'-' + ('0' + dateStartPicker.getDate()).slice(-2)  +  ' ' + readTimeEnd;

              return dbHelper.scanTimeDate( readDateTimeStart, readDateTimeEnd) // , transportDemandId, typesOfTools, machines, diameter
              .then((data)=>{
                        if (data.length === 0) {
                          const speechText = `Es gibt keinen Transportauftrag zu diesem Zeitraum.`;
                              return responseBuilder
                                .speak(speechText)
                                .reprompt()
                                .getResponse();
                        } else {
                                let speakOutput;
                                    speakOutput = data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools} mit ${e.diameter} Millimeter Durchmesser für Fertigungsauftrag ${e.manufactureOrder} und -schritt ${e.manufactureStep}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                                    //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                                    return responseBuilder
                                      .speak(speakOutput)
                                      .reprompt()
                                      .getResponse();     
                        }
                    })
                    .catch((err) => {
                      console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
                      const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!";
                      return responseBuilder
                        .speak(speechText)
                        .getResponse();
                    }) 
                  }

          else if (readTimeStart !== undefined && readTimeEnd !== undefined && readDateStart !== undefined && readDateEnd !== undefined ){
            if (readTimeStart.length <= 5 ) {
              readTimeStart = readTimeStart + ':00';
            }
            if (readTimeEnd.length <= 5 ) {
                  readTimeEnd = readTimeEnd + ':00';
            }

            let readDateTimeStart = readDateStart + ' ' + readTimeStart;
            let readDateTimeEnd =  readDateEnd + ' ' + readTimeEnd;

            return dbHelper.scanTimeDate( readDateTimeStart, readDateTimeEnd) // , transportDemandId, typesOfTools, machines, diameter
            .then((data)=>{
                      if (data.length === 0) {
                        const speechText = `Es gibt keinen Transportauftrag zu diesem Zeitraum.`;
                            return responseBuilder
                              .speak(speechText)
                              .reprompt()
                              .getResponse();
                      } else {
                              let speakOutput;
                                  speakOutput = data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools} mit ${e.diameter} Millimeter Durchmesser für Fertigungsauftrag ${e.manufactureOrder} und -schritt ${e.manufactureStep}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                                  //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                                  return responseBuilder
                                    .speak(speakOutput)
                                    .reprompt()
                                    .getResponse();     
                      }
                  })
                  .catch((err) => {
                    console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
                    const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!";
                    return responseBuilder
                      .speak(speechText)
                      .getResponse();
                  }) 
              }


          else if ((readTimeStart !== undefined || readTimeEnd !== undefined) && (readDateStart !== undefined || readDateEnd !== undefined) ){
            if (readTimeStart !== undefined && readTimeStart.length <= 5 ) {
              readTimeStart = readTimeStart + ':00';
            }
            if (readTimeEnd !== undefined && readTimeEnd.length <= 5 ) {
                  readTimeEnd = readTimeEnd + ':00';
            }
            if (readDateStart === undefined){
             readDateStart =  dateStartPicker.getFullYear() + '-' + ('0' + (dateStartPicker.getMonth()+1)).slice(-2) +'-' + ('0' + dateStartPicker.getDate()).slice(-2);
            }
            if (readDateEnd === undefined){
              readDateEnd =  dateStartPicker.getFullYear() + '-' + ('0' + (dateStartPicker.getMonth()+1)).slice(-2) +'-' + ('0' + dateStartPicker.getDate()).slice(-2);
             }

            let readDateTimeStart;
            let readDateTimeEnd;

            if(readTimeStart === undefined){
              readDateTimeStart = readDateStart + ' 00:00:00';
            } else {
              readDateTimeStart = readDateStart +  readTimeStart;
            }

            if(readTimeEnd === undefined){
              readDateTimeEnd = readDateEnd + ' 24:00:00';
            } else {
              readDateTimeEnd = readDateEnd +  readTimeEnd;
            }

            return dbHelper.scanTimeDate( readDateTimeStart, readDateTimeEnd) // , transportDemandId, typesOfTools, machines, diameter
            .then((data)=>{
                      if (data.length === 0) {
                        const speechText = `Es gibt keinen Transportauftrag zu diesem Zeitraum.`;
                            return responseBuilder
                              .speak(speechText)
                              .reprompt()
                              .getResponse();
                      } else {
                              let speakOutput;
                                  speakOutput = data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools} mit ${e.diameter} Millimeter Durchmesser für Fertigungsauftrag ${e.manufactureOrder} und -schritt ${e.manufactureStep}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                                  //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                                  return responseBuilder
                                    .speak(speakOutput)
                                    .reprompt()
                                    .getResponse();     
                      }
                  })
                  .catch((err) => {
                    console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
                    const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!";
                    return responseBuilder
                      .speak(speechText)
                      .getResponse();
                  }) 
              }
    }


   else if ((transportDemandId === undefined || transportDemandId === "?") || (typesOfTools !== undefined || machines !== undefined || diameter !== undefined)){

        if ((transportDemandId === undefined || transportDemandId === "?" )&& (typesOfTools === undefined && machines === undefined && diameter === undefined)){
            return handlerInput.responseBuilder
                .speak('Ich benötige die ID des Transportauftrags')
                .addElicitSlotDirective('transportauftrag')
                .getResponse();
            }  
      
      else if ((transportDemandId === undefined || transportDemandId === "?") && (typesOfTools !== undefined || machines !== undefined || diameter !== undefined)){        
        if(typesOfTools === undefined){
          let explainSpeak = 'Ich benötige den Werkzeugtyp.'
          return handlerInput.responseBuilder   
          .speak(explainSpeak)
          .addElicitSlotDirective('werkzeugtyp')
          .getResponse();  
        } 
        if (diameter === undefined){
          let explainSpeak = 'Ich benötige den Werkzeugtyp und Durchmesser.'
          return handlerInput.responseBuilder   
          .speak(explainSpeak)
          .addElicitSlotDirective('durchmesser')
          .getResponse(); 
        } 
        if (machines === undefined ){
          let explainSpeak = 'Ich benötige Angaben zur Maschine.'
          return handlerInput.responseBuilder   
          .speak(explainSpeak)
          .addElicitSlotDirective('maschine')
          .getResponse(); 
        }
      } 
  }


      else if (transportDemandId !== undefined && transportDemandId !== "?" ) {
        return dbHelper.getTransportDemand(userID, transportDemandId) // , transportDemandId
          .then((data)=>{
            if (data.length === 0) {
              const speechText = `Es gibt keinen Transportauftrag mit der ID ${transportDemandId}.`;
                  return responseBuilder
                    .speak(speechText)
                    .reprompt()
                    .getResponse();
            } else {
                let speakOutput;
                    speakOutput = data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools} mit ${e.diameter} Millimeter Durchmesser für Fertigungsauftrag ${e.manufactureOrder} und -schritt ${e.manufactureStep}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                    //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                    return responseBuilder
                      .speak(speakOutput)
                      .reprompt()
                      .getResponse();
            }
        })
        .catch((err) => {
          console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
          return responseBuilder
            .speak("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!")
            .getResponse();
        })        
      }    
           
    }
};

//--------------------------------------------------------------

const ReadArrivelMoreInfoTDemandHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'ReadArrivalTimeTDemandIntent'
    && 
    handlerInput.requestEnvelope.request.intent.confirmationStatus === "CONFIRMED";
  },
  async handle(handlerInput){
    //const {responseBuilder } = handlerInput; //dynmaoDB
    const slots = handlerInput.requestEnvelope.request.intent.slots; 
    const transportDemandId = slots.transportauftrag.value;
    
   /* const typesOfTools = slots.werkzeugtyp.value;
    const machines = slots.maschine.value;
    const diameter = slots.durchmesser.value;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
          sessionAttributes.maschine = machines;
          sessionAttributes.werkzeugtyp = typesOfTools;
          sessionAttributes.durchmesser = diameter;
          handlerInput.attributesManager.setSessionAttributes(sessionAttributes);*/
       
   return handlerInput.responseBuilder
      .addDelegateDirective({
          name: 'ReadTransportDemandIntent',
          confirmationStatus: 'NONE',
          slots: {
            "datum": {
              "name": "datum",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "maschine": {
              "name": "maschine", 
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "vonDatum": {
              "name": "vonDatum",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "werkzeugtyp": {
              "name": "werkzeugtyp",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "bisDatum": {
              "name": "bisDatum",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "vonZeit": {
              "name": "vonZeit",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "durchmesser": {
              "name": "durchmesser",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "bisZeit": {
              "name": "bisZeit",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "transportauftrag": {
              "name": "transportauftrag",
              "value": transportDemandId,
              "confirmationStatus": "NONE",
              "_tokens": []
            }        
          }
        })
      .getResponse();  
  }
};


const InProgressReadArrivelTimeTDemandHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'ReadArrivalTimeTDemandIntent'
    && 
    handlerInput.requestEnvelope.request.intent.confirmationStatus !==  "DENIED";
  },
  async handle(handlerInput){
    const {responseBuilder } = handlerInput; //dynmaoDB
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const transportDemandId = slots.transportauftrag.value;
    const typesOfTools = slots.werkzeugtyp.value;
    const machines = slots.maschine.value;
    const diameter = slots.durchmesser.value;    
    const userID = handlerInput.requestEnvelope.context.System.user.userId;

    let speakOutput;

  if (transportDemandId === undefined){
      return handlerInput.responseBuilder   
            .addDelegateDirective()
            .getResponse();  
      } 
      
  else if (transportDemandId !== undefined && transportDemandId !== "?" ){

    return dbHelper.getTransportDemand(userID, transportDemandId) // , transportDemandId, typesOfTools, machines, diameter
    .then((data)=>{
              if (data.length === 0) {
                const speechText = `Es gibt keinen Transportauftrag mit der ID ${transportDemandId}.`;
                    return responseBuilder
                      .speak(speechText)
                      .getResponse();
              } else {
                  speakOutput = data.map(e => `Der Transportauftrag ${transportDemandId} kommt am  ${e.arrivalTime} Uhr an`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                  //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                  sessionAttributes.transportauftrag = transportDemandId;
                  return responseBuilder
                    .speak(speakOutput)
                    .addDelegateDirective()
                    .reprompt()
                    .getResponse();
              }
          })
          .catch((err) => {
            const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!"
            return responseBuilder
              .speak(speechText)
              .getResponse();
          })      
   } 
 else if ((transportDemandId === undefined || transportDemandId === "?") && (typesOfTools !== undefined || machines !== undefined || diameter !== undefined)){
  sessionAttributes.maschine = machines;
  sessionAttributes.werkzeugtyp = typesOfTools;
  sessionAttributes.durchmesser = diameter;     
    return handlerInput.responseBuilder   
            .addDelegateDirective({
                name: 'ReadArrivelTimeIntent',
                confirmationStatus: 'NONE',
                slots: {
                  "werkzeugtyp": {
                  "name": "werkzeugtyp",
                  "value": typesOfTools,
                  "resolutions": {},
                  "confirmationStatus": "NONE"  
                  },
                  "durchmesser": {
                    "name": "durchmesser",
                    "value": diameter,
                    "resolutions": {},
                    "confirmationStatus": "NONE"  
                  },
                  "maschine": {
                      "name": "maschine",
                      "value": machines,
                      "resolutions": {},
                      "confirmationStatus": "NONE"  
                  }          
                }
              })
            .getResponse();  
      }
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
  }
};


const ReadArrivelTimeMoreInfoHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'ReadArrivelTimeIntent'
    && 
    handlerInput.requestEnvelope.request.intent.confirmationStatus === "CONFIRMED";
  },
  async handle(handlerInput){
    //const {responseBuilder } = handlerInput; //dynmaoDB
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const typesOfTools = slots.werkzeugtyp.value;
    const machines = slots.maschine.value;
    const diameter = slots.durchmesser.value;
    //const transportDemandId = slots.transportauftrag.value;
    
   /* const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
          sessionAttributes.maschine = machines;
          sessionAttributes.werkzeugtyp = typesOfTools;
          sessionAttributes.durchmesser = diameter;
          handlerInput.attributesManager.setSessionAttributes(sessionAttributes);*/
       
   return handlerInput.responseBuilder
      .addDelegateDirective({
          name: 'ReadTransportDemandIntent',
          confirmationStatus: 'NONE',
          slots: {
            "datum": {
              "name": "datum",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "maschine": {
              "name": "maschine", 
              "value": machines,
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "vonDatum": {
              "name": "vonDatum",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "werkzeugtyp": {
              "name": "werkzeugtyp",
              "value": typesOfTools,
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "bisDatum": {
              "name": "bisDatum",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "vonZeit": {
              "name": "vonZeit",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "durchmesser": {
              "name": "durchmesser",
              "value": diameter,
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "bisZeit": {
              "name": "bisZeit",
              "confirmationStatus": "NONE",
              "_tokens": []
            },
            "transportauftrag": {
              "name": "transportauftrag",
              //"value": transportDemandId,
              "confirmationStatus": "NONE",
              "_tokens": []
            }        
          }
        })
      .getResponse();  
  }
};


const ReadArrivelTimeHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'ReadArrivelTimeIntent'
    && 
    handlerInput.requestEnvelope.request.intent.confirmationStatus !==  "DENIED";
    //&& "DENIED"
  //  handlerInput.requestEnvelope.request.dialogState === "COMPLETED";
  },
  async handle(handlerInput){
    const {responseBuilder } = handlerInput; //dynmaoDB
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const typesOfTools = slots.werkzeugtyp.value;
    const machines = slots.maschine.value;
    const diameter = slots.durchmesser.value;
    //let transportDemandId;
   
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
          sessionAttributes.maschine = machines;
          sessionAttributes.werkzeugtyp = typesOfTools;
          sessionAttributes.durchmesser = diameter;
          handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  if (typesOfTools === undefined || machines === undefined || diameter === undefined){
            if(typesOfTools === undefined){
              let explainSpeak = 'Ich benötige den Werkzeugtyp.'
              return handlerInput.responseBuilder   
              .speak(explainSpeak)
              .addElicitSlotDirective('werkzeugtyp')
              .getResponse();  
            } 
            if (diameter === undefined){
              let explainSpeak = 'Ich benötige den Werkzeugtyp und Durchmesser.'
              return handlerInput.responseBuilder   
              .speak(explainSpeak)
              .addElicitSlotDirective('durchmesser')
              .getResponse(); 
            } 
            if (machines === undefined ){
              let explainSpeak = 'Ich benötige Angaben zur Maschine.'
              return handlerInput.responseBuilder   
              .speak(explainSpeak)
              .addElicitSlotDirective('maschine')
              .getResponse(); 
            }
    } 
    
  else if (typesOfTools !== undefined && machines !== undefined && diameter !== undefined) {
  //let speakOutput = `Der ${typesOfTools} mit dem Durchmesser von ${diameter} Millimeter an ${machines} kommt um  [9.00 Uhr] an. Möchtest du mehr Informationen zu diesem Transportauftrag?`; 
  return dbHelper.scanTransportDemand(typesOfTools, machines, diameter) // , transportDemandId, typesOfTools, machines, diameter
  .then((data)=>{
            if (data.length === 0) {
              const speechText = `Es gibt keinen Transportauftrag mit den Angaben ${typesOfTools}, ${diameter} Millimeter Durchmesser und ${machines}.`;
                  return responseBuilder
                    .speak(speechText)
                    .getResponse();
            } else if (data.length === 1) {

            //transportDemandId = data.map(e => e.TransportDemandsId).join(",");
              
            let speakOutput;
                speakOutput = data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                return responseBuilder
                  .speak(speakOutput)
                  .addDelegateDirective()
                  .getResponse();
            }
            else if (data.length > 1) {
              //transportDemandId = data.map(e => e.TransportDemandsId).join(",");
              //sessionAttributes.transportauftrag = transportDemandId;

            let speakOutput;
                speakOutput = `Es gibt ${data.length} passende Transportaufträge. `+ data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an der ${e.machines} an und beinhaltet den ${e.typesOfTools}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                //data.map(e => 'Der Transportauftrag '+ e.TransportDemandsId +' kommt um  ' + e.arrivalTime + ' Uhr an der ' + e.machines + ' an und beinhaltet den ' + e.typesOfTools + ' mit ' + e.diameter + ' Millimeter Durchmesser.').join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                return responseBuilder
                  .speak(speakOutput)
                  .reprompt()
                  .addDelegateDirective()
                  .getResponse();
            }
        })
  .catch((err) => {
    const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!"
    return responseBuilder
      .speak(speechText)
      .getResponse();
  })   
  }
}
};


//-------------------------------------------------------------------------------------
const DeleteDemandConfirmedHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'DeleteDemandIntent'
    && 
    handlerInput.requestEnvelope.request.intent.confirmationStatus === "CONFIRMED";
  },
  async handle(handlerInput){
    const {responseBuilder } = handlerInput; //dynamoDB
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    let transportDemandId = slots.transportauftrag.value;
    if (transportDemandId !== undefined && transportDemandId !== "?"){
      return dbHelper.removeDemand(userID, transportDemandId) 
           .then((data) => {
             let speakOutput = `Transportauftrag ${transportDemandId} erfolgreich gelöscht.` //+ data.map(e => e.arrivalTime).join(", "
             return handlerInput.responseBuilder
                   .speak(speakOutput)
                   .reprompt()
                   .getResponse();  
               })
               .catch((err) => {
                 console.log("Ein fehler erfolgte beim löschen der Daten", err);
                 const speechText = "Die Daten existieren nicht in der Datenbank!"
                 return responseBuilder
                   .speak(speechText)
                   .getResponse();
               })
   }
  }
}

const DeleteDemandHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    getIntentName(handlerInput.requestEnvelope) === 'DeleteDemandIntent';
  },
  async handle(handlerInput){
    const {responseBuilder } = handlerInput; //dynamoDB
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    let transportDemandId = slots.transportauftrag.value;
    const typesOfTools = slots.werkzeugtyp.value;
    const machines = slots.maschine.value;
    const diameter = slots.durchmesser.value; 
    let timeStart = slots.sollZeit.value;
    const dateStart = slots.sollDatum.value;
    const dateStartPicker = new Date (handlerInput.requestEnvelope.request.timestamp);
    const manufactureOrder = slots.fertigungsauftrag.value;
    let arrivalTime;

    if (timeStart !== undefined|| dateStart !== undefined){
        if (timeStart.length <= 5 ) {
          timeStart = timeStart + ':00';
        }

        if (dateStart !== undefined){
          arrivalTime = dateStart + ' ' + timeStart;
        } else {
          arrivalTime = dateStartPicker.getFullYear() + '-' + ('0' + (dateStartPicker.getMonth()+1)).slice(-2) +'-' + ('0' + dateStartPicker.getDate()).slice(-2)  +  ' ' + timeStart;   
        }
    } else {
      arrivalTime = undefined;
    }
    

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

  if (transportDemandId === undefined && typesOfTools === undefined && machines === undefined && diameter === undefined){
    //let explainSpeak = 'Wenn du die ID des Transportauftrags hast kannst du den Auftrag direkt löschen. Ansonsten benötige ich mehrere Angaben. Ich benötige den Werkzeugtyp, Durchmesser, Maschine und die Ankunftszeit, den zugehörigen Fertigungsauftrag oder -schritt.';
    return handlerInput.responseBuilder   
          //.speak(explainSpeak)
          .addDelegateDirective()
          .getResponse();  
    } 

    else if (transportDemandId !== undefined && transportDemandId !== "?"){
              return handlerInput.responseBuilder
                    .addDelegateDirective()
                    .reprompt()
                    .getResponse();  
    }

    else if (transportDemandId === undefined && typesOfTools !== undefined && machines !== undefined && diameter !== undefined &&  (arrivalTime !== undefined  || manufactureOrder !== undefined)){
        /* let ArrayOfVariables = [typesOfTools, machines, diameter, manufactureOrder, manufactureStep, arrivalTime];   
          for (let i=0; i < ArrayOfVariables.length; i++){
            if (typeof ArrayOfVariables[i] === 'undefined') {
              ArrayOfVariables.splice(i,1);
            }
          }
          */
        if (arrivalTime !== undefined  && manufactureOrder !== undefined ){  

                  return dbHelper.scanDeleteDemand(typesOfTools, machines, diameter, manufactureOrder, arrivalTime) // , transportDemandId, typesOfTools, machines, diameter
                  .then((data)=>{

                    if (data.length === 0) {
                      const speechText = `Es gibt keinen Transportauftrag mit den Angaben ${typesOfTools}, ${diameter} Millimeter Durchmesser und ${machines}.`;
                          return responseBuilder
                            .speak(speechText)
                            .getResponse();
                    }
                    else if (data.length > 1){
                        let speakOutput = `Es gibt ${data.length} Transportaufträge mit den Angaben. ` + data.map(e => e.TransportDemandsId).join(", ") //+ data.map(e => e.arrivalTime).join(", ")
                            return responseBuilder
                              .speak(speakOutput)
                              .reprompt()
                              .getResponse();
                    } 
                    else if (data.length === 1){
                      transportDemandId = data.map(e => e.TransportDemandsId).join(",");
                      return handlerInput.responseBuilder
                      .addDelegateDirective({
                        name: 'DeleteDemandIntent',
                        confirmationStatus: 'NONE',
                        slots: {
                              "sollZeit": {
                                "name": "sollZeit",
                                "confirmationStatus": "NONE",
                                "source": "USER",
                                "_tokens": []
                              },
                              "fertigungsauftrag": {
                                "name": "fertigungsauftrag",
                                "value": manufactureOrder,
                                "confirmationStatus": "NONE",
                                "source": "USER",
                                "_tokens": []
                              },
                              "maschine": {
                                "name": "maschine",
                                "value": machines,
                                "confirmationStatus": "NONE",
                                "source": "USER",
                                "_tokens": []
                              },
                              "werkzeugtyp": {
                                "name": "werkzeugtyp",
                                "value": typesOfTools,
                                "confirmationStatus": "NONE",
                                "source": "USER",
                                "_tokens": []
                              },
                                "durchmesser": {
                                  "name": "durchmesser",
                                  "value": diameter,
                                  "confirmationStatus": "NONE",
                                  "source": "USER",
                                  "_tokens": []
                                },
                                "sollDatum": {
                                  "name": "sollDatum",
                                  "confirmationStatus": "NONE",
                                  "_tokens": []
                                },
                                "transportauftrag": {
                                  "name": "transportauftrag",
                                  "value": transportDemandId,
                                  "confirmationStatus": "NONE",
                                  "_tokens": []
                                }      
                        }
                      })
                      .getResponse(); 
                    }
                    
                  })
                  .catch((err) => {
                    console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
                    const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!"
                    return responseBuilder
                      .speak(speechText)
                      .getResponse();
                  })
        }


        else if (arrivalTime !== undefined  && manufactureOrder === undefined ){  

                  return dbHelper.scanDeleteTimeDemand(typesOfTools, machines, diameter, arrivalTime) // , transportDemandId, typesOfTools, machines, diameter
                  .then((data)=>{

                    if (data.length === 0) {
                      const speechText = `Es gibt keinen Transportauftrag mit den Angaben ${typesOfTools}, ${diameter} Millimeter Durchmesser und ${machines} um ${arrivalTime}.`;
                          return responseBuilder
                            .speak(speechText)
                            .getResponse();
                    }
                    else if (data.length > 1){
                        let speakOutput =  `Es gibt ${data.length} Transportaufträge mit den Angaben. ` + data.map(e => `Der Transportauftrag ${e.TransportDemandsId} für Fertigungsauftrag ${e.manufactureOrder}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                        return responseBuilder
                              .speak(speakOutput)
                              .reprompt()
                              .getResponse();
                    } 
                    else if (data.length === 1){
                      transportDemandId = data.map(e => e.TransportDemandsId).join(",");
                      return handlerInput.responseBuilder
                      .addDelegateDirective({
                        name: 'DeleteDemandIntent',
                        confirmationStatus: 'NONE',
                        slots: {
                          "sollZeit": {
                            "name": "sollZeit",
                            "confirmationStatus": "NONE",
                            "source": "USER",
                            "_tokens": []
                          },
                          "fertigungsauftrag": {
                            "name": "fertigungsauftrag",
                            "confirmationStatus": "NONE",
                            "source": "USER",
                            "_tokens": []
                          },
                          "maschine": {
                            "name": "maschine",
                            "value": machines,
                            "confirmationStatus": "NONE",
                            "source": "USER",
                            "_tokens": []
                          },
                          "werkzeugtyp": {
                            "name": "werkzeugtyp",
                            "value": typesOfTools,
                            "confirmationStatus": "NONE",
                            "source": "USER",
                            "_tokens": []
                          },
                            "durchmesser": {
                              "name": "durchmesser",
                              "value": diameter,
                              "confirmationStatus": "NONE",
                              "source": "USER",
                              "_tokens": []
                            },
                            "sollDatum": {
                              "name": "sollDatum",
                              "confirmationStatus": "NONE",
                              "_tokens": []
                            },
                            "transportauftrag": {
                              "name": "transportauftrag",
                              "value": transportDemandId,
                              "confirmationStatus": "NONE",
                              "_tokens": []
                            }   
                        }
                      })
                      .getResponse(); 
                    }
                  })
                  .catch((err) => {
                    console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
                    const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!"
                    return responseBuilder
                      .speak(speechText)
                      .getResponse();
                  })
        }

        else if (arrivalTime === undefined  && manufactureOrder !== undefined ){  

          return dbHelper.scanDeleteOrderDemand(typesOfTools, machines, diameter, manufactureOrder) // , transportDemandId, typesOfTools, machines, diameter
          .then((data)=>{

            if (data.length === 0) {
              const speechText = `Es gibt keinen Transportauftrag mit den Angaben ${typesOfTools}, ${diameter} Millimeter Durchmesser und ${machines} mit Fertigungsauftrag ${manufactureOrder}.`;
                  return responseBuilder
                    .speak(speechText)
                    .getResponse();
            }
            else if (data.length > 1){
                let speakOutput =  `Es gibt ${data.length} Transportaufträge mit den Angaben. ` + data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt um ${e.arrivalTime} Uhr`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                    return responseBuilder
                      .speak(speakOutput)
                      .reprompt()
                      .getResponse();
            } 
            
            else if (data.length === 1){
              transportDemandId = data.map(e => e.TransportDemandsId).join(",");
              return handlerInput.responseBuilder
              .addDelegateDirective({
                name: 'DeleteDemandIntent',
                confirmationStatus: 'NONE',
                slots: {
                  "sollZeit": {
                    "name": "sollZeit",
                    "confirmationStatus": "NONE",
                    "source": "USER",
                    "_tokens": []
                  },
                  "fertigungsauftrag": {
                    "name": "fertigungsauftrag",
                    "value": manufactureOrder,
                    "confirmationStatus": "NONE",
                    "source": "USER",
                    "_tokens": []
                  },
                  "maschine": {
                    "name": "maschine",
                    "value": machines,
                    "confirmationStatus": "NONE",
                    "source": "USER",
                    "_tokens": []
                  },
                  "werkzeugtyp": {
                    "name": "werkzeugtyp",
                    "value": typesOfTools,
                    "confirmationStatus": "NONE",
                    "source": "USER",
                    "_tokens": []
                  },
                    "durchmesser": {
                      "name": "durchmesser",
                      "value": diameter,
                      "confirmationStatus": "NONE",
                      "source": "USER",
                      "_tokens": []
                    },
                    "sollDatum": {
                      "name": "sollDatum",
                      "confirmationStatus": "NONE",
                      "_tokens": []
                    },
                    "transportauftrag": {
                      "name": "transportauftrag",
                      "value": transportDemandId,
                      "confirmationStatus": "NONE",
                      "_tokens": []
                    }       
                }
              })
              .getResponse(); 
            }
            
          })
          .catch((err) => {
            console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
            const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!"
            return responseBuilder
              .speak(speechText)
              .getResponse();
          })
        } 
  }


else if ((transportDemandId === undefined || transportDemandId === "?") && typesOfTools !== undefined && machines !== undefined && diameter !== undefined  ){ //&& ( manufactureOrder !== undefined || arrivalTime !== undefined || manufactureStep !== undefined)
      return dbHelper.scanTransportDemand(typesOfTools, machines, diameter) // , transportDemandId, typesOfTools, machines, diameter
      .then((data)=>{

        if (data.length === 0) {
          const speechText = `Es gibt keinen Transportauftrag mit den Angaben ${typesOfTools}, ${diameter} Millimeter Durchmesser und ${machines}.`;
              return responseBuilder
                .speak(speechText)
                .getResponse();
        }
        else if (data.length > 1){
            let speakOutput =  `Es gibt ${data.length} Transportaufträge mit den Angaben ${typesOfTools}, ${diameter} Millimeter Durchmesser an ${machines}. ` + data.map(e => `Der Transportauftrag ${e.TransportDemandsId} kommt am  ${e.arrivalTime} Uhr an für Fertigungsauftrag ${e.manufactureOrder}`).join(". ") //+ data.map(e => e.arrivalTime).join(", ")
                return responseBuilder
                  .speak(speakOutput)
                  .reprompt()
                  .getResponse();
        } 
        else if (data.length === 1){
          transportDemandId = data.map(e => e.TransportDemandsId).join(",");
          return handlerInput.responseBuilder
          .addDelegateDirective({
            name: 'DeleteDemandIntent',
            confirmationStatus: 'NONE',
            slots: {
              "sollZeit": {
                "name": "sollZeit",
                "confirmationStatus": "NONE",
                "source": "USER",
                "_tokens": []
              },
              "fertigungsauftrag": {
                "name": "fertigungsauftrag",
                "confirmationStatus": "NONE",
                "source": "USER",
                "_tokens": []
              },
              "maschine": {
                "name": "maschine",
                "value": machines,
                "confirmationStatus": "NONE",
                "source": "USER",
                "_tokens": []
              },
              "werkzeugtyp": {
                "name": "werkzeugtyp",
                "value": typesOfTools,
                "confirmationStatus": "NONE",
                "source": "USER",
                "_tokens": []
              },
                "durchmesser": {
                  "name": "durchmesser",
                  "value": diameter,
                  "confirmationStatus": "NONE",
                  "source": "USER",
                  "_tokens": []
                },
                "sollDatum": {
                  "name": "sollDatum",
                  "confirmationStatus": "NONE",
                  "_tokens": []
                },
                "transportauftrag": {
                  "name": "transportauftrag",
                  "value": transportDemandId,
                  "confirmationStatus": "NONE",
                  "_tokens": []
                }    
            }
          })
          .getResponse(); 
        }
        
      })
      .catch((err) => {
        console.log("Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!", err);
        const speechText = "Der richtige Auftrag konnte nicht gefunden werden. Versuche es nochmal!"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })     

  }

  else if ((transportDemandId === undefined || transportDemandId === "?") && (typesOfTools !== undefined || machines !== undefined || diameter !== undefined)){

    if(typesOfTools === undefined){
      let explainSpeak = 'Ich benötige den Werkzeugtyp.'
      return handlerInput.responseBuilder   
      .speak(explainSpeak)
      .addElicitSlotDirective('werkzeugtyp')
      .getResponse();  
    } 
    if (diameter === undefined){
      let explainSpeak = 'Ich benötige den Werkzeugtyp und Durchmesser.'
      return handlerInput.responseBuilder   
      .speak(explainSpeak)
      .addElicitSlotDirective('durchmesser')
      .getResponse(); 
    } 
    if (machines === undefined ){
      let explainSpeak = 'Ich benötige Angaben zur Maschine.'
      return handlerInput.responseBuilder   
      .speak(explainSpeak)
      .addElicitSlotDirective('maschine')
      .getResponse(); 
    }
    } 

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
   
  }
};

//----------------------------------------------------------------------------------------------------------

const DeniedHandler = {
  canHandle(handlerInput) {
    return getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
    &&
    (getIntentName(handlerInput.requestEnvelope) === 'ReadArrivelTimeIntent'
    ||
    getIntentName(handlerInput.requestEnvelope) === 'DeleteDemandIntent'
    || 
    getIntentName(handlerInput.requestEnvelope) === 'ReadArrivalTimeTDemandIntent'
    ||
    getIntentName(handlerInput.requestEnvelope) === 'CreateToolDemandIntent'
    )

    && 
    handlerInput.requestEnvelope.request.intent.confirmationStatus ===  "DENIED";
    //&& "DENIED"
  //  handlerInput.requestEnvelope.request.dialogState === "COMPLETED";
  },
  handle(handlerInput){

        let explainSpeak = 'Ok, Danke! Kann ich dir sonst noch weiter helfen?'
          return handlerInput.responseBuilder   
              .speak(explainSpeak)
              .reprompt()
              .getResponse();          
    } 
};

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'Ich helfe dir Werkzeuge anzufordern, Bestellungen zu ändern und zu löschen. Sowie Informationen zu den Robotern und Werkzeugbestellungen abzufragen.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const CancelAndStopHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Tschüss. Ich wünsche dir einen schönen Tag.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Die Session wurde beendet, weil ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle(handlerInput, error){
    return true;
  },
  handle(handlerInput, error){
      console.log(`Error handled: ${error.message}`);
  console.log(error.trace);

  return handlerInput.responseBuilder
    .speak('Entschuldige, ich konnte die Anfrage nicht verstehen. Bitte wiederhole deine Anfrage.')
    .reprompt()
    .getResponse();
  }
};

//const skillBuilder = Alexa.SkillBuilders.custom(); //Ohne DynamoDB
const skillBuilder = Alexa.SkillBuilders.standard(); //Änderung nötig für DynamoDB

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    CreateToolDemandHandler,
    FirstInformationHandler,
    DeniedHandler,
    ReadTransportDemandHandler,
    ReadArrivelMoreInfoTDemandHandler,
    InProgressReadArrivelTimeTDemandHandler,
    //ReadArrivelTimeTDemandHandler,
    ReadArrivelTimeMoreInfoHandler,
    ReadArrivelTimeHandler,
    //YesIntentHandler,
   // NoIntentHandler,
    DeleteDemandConfirmedHandler,
    DeleteDemandHandler,
    HelpHandler,
    CancelAndStopHandler,
    SessionEndedRequestHandler,
  )
  //.addRequestInterceptors(
  //  DialogManagementStateInterceptor
  //)
  .addErrorHandlers(ErrorHandler)
  .withTableName(dynamoDBTableName)
  .withAutoCreateTable(true)
  .lambda();

