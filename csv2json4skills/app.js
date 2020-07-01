
const async = require('async');
const fs = require('fs');
const Papa = require('papaparse');
const { parse } = require('path');
const { concat } = require('async');
//HIER WERDEN ALLE CSV-DATEIN ANGEGEBEN DIE KONVERTIERT WERDEN SOLLEN!------------------------------

const files = ['autoWerkDb.csv','TypesOfHandle.csv', 'Storages.csv',  'TypesOfTools.csv'];

//--------------------------------------------------------------------------------------------------
// OPTIONAL: WENN SYNONYME MIT BETRACHTET WERDEN SOLLEN, KÖNNEN SYNONYME WÖRTER IN EINEM ARRAY ABGEBILDET WERDEN!
// TRAGE DAZU ALLE SYNONYME EINES WÖRTES IN EIN ENTSPRECHENDES ARRAY!
// MÖCHTEST DU KEINE SYNONYME BETRACHTEN KANNST DU DAS ARRAY LEER LASSEN! 
//ARRAYS SYNONYMS KANN MAN EVTL NOCH IN EINEM ANDEREN FILE AUSLAGERN
const Synonyms = [
                  ["Drehmeißel","Bohrstange"], 
                  ["Gewindedrehmeißel", "Gewindestrehler", "Gewindeschneideisen", "Schneidkluppen"],
                  ["Walzenfräser","Umfangsfräser"],
                  ["Messerkopf", "Stirnfräser", "Fräskopf",  "Planfräser", "Eckfräser"],
                  ["Scheibenfräser","Trennfräser"],
                  [ "Spiralbohrer","Wendelbohrer", "Wendelnutenbohrer"],
                  ["Wendeplattenbohrer","Bohrer mit Wendeschneidplatten"],
                  ["Zentrierbohrer","Anbohrer"],
                  ["Ejektorbohrer", "Tieflochbohrer", "Teifbohrer"],
                  ["Schälbohrer", "Stufenbohrer"],
                  ["Spiralsenker", "Aufbohrer", "Senkbohrer"],
                  ["Fließbohrer", "Fließlochbohrer"],
                  ["Gewindeschneidbohrer","Gewindebohrer", "Schraubbohrer", "Mutterbohrer"],
                  ["Kegelsenker", "Senker"],
                  ["Flachsenker", "Plansenker"],
                  ["Aufstecksenker", "Versenker"],
                  ["Kegelreibahle", "Räumahle"],
                  ["Handreibahle", "Räumer"],
                  ["Drehmaschine", "Drehbank"],
                  ["Leit- und Zugspindeldrehmaschine", "Waagerechtdrehmaschine"],
                  ["Nachformdrehmaschine", "Kopierdrehmaschine"],
                  ["Karuselldrehmaschine", "Vertikaldrehmaschine"],
                  ["Kurzdrehautomat", "Kurzdreher"],
                  ["Langdrehautomat", "Langdreher"],
                  ["Flachbettdrehmaschine", "Plandrehmaschine"],
                  ["Drehzellen", "Fertigungszellen"],
                  ["Fräsmaschine", "Fräse"],
                  ["Kopierfräsmaschine", "Nachformfräsmaschine"],
                  ["Bearbeitungszentrum", "BAZ", "Fertigungszentrum"],
                  ["Ständerbohrmaschine", "Säulenbohrmaschine", "Pultbohrmaschine"],
                  ["Radialbohrmaschine", "Schwenkbohrmaschine", "Kranbohrmaschine", "Auslegerbohrmaschine"]
]
//-------------------------------------------

const file = []
  for (let i=0; i < files.length; i++){
      file[i] = fs.readFileSync(files[i], 'utf8');
  }

const parseOptions = {
    quoteChar: '"', // quoting character
    delimiter: '',  // wenn delimiter nicht gesetzt ist dann wird er hier Geraten DelimiterToGuess
    skipEmptyLines: true, // ignore empty lines
    dynamicTyping: true,  // parse numbers automatically
}
    
const types = [];
const arrayValues = [];

const parseResult = [];
  for (let i=0; i < files.length; i++){
      parseResult[i] = Papa.parse(file[i], parseOptions);
  }
          
const equalParsedData = [];
  for (let i=0; i < files.length; i++){
      equalParsedData[i] = parseResult[i].data;
  }
        
//EqualParsedData Array mit der längsten Länge herausfinden
var dataLength = [];
    for (let i=0; i < files.length; i++){
      dataLength.push(equalParsedData[i].length)
    }
    dataLength.sort(function(a,b){return b - a});
       
//Hier werden die Files nach der größe der Datensätze sortiert um sie Später zusammen fügen zu können!
const sortedData = [];
    for (let j=0; j < dataLength.length; j++){
        for (let i=0; i < files.length; i++){
            if (equalParsedData[i].length === dataLength[j]){
              sortedData.push(equalParsedData[i])
            }
        }
    } 
  
  //Zusammenführen der Files nach der Anzahl der Datensätze
  const parsedData = [];
      for (let i=0; i < dataLength[0]; i++){
      //var joinedData =[sortedData[0][i]];
      var joinedData =[];
          if (files.length === 1){
            joinedData = sortedData[0][i]
          }
          else {
            for (let j=1; j < files.length ; j++){
// HIER NOCH VERBESSERN WICHTIG!!!!
//Hier gibts noch Probleme!! so oft Concat() wie Files... Dynamisch!!
              //var joinTurns = [concat(sortedData[j][i])];
              //joinedData.push(joinTurns)
              joinedData =sortedData[0][i].concat(sortedData[1][i]).concat(sortedData[2][i]).concat(sortedData[3][i]) 
// HIER NOCH VERBESSERN WICHTIG!!!!
            }
        }
        parsedData.push(joinedData)
    }
//-------------------------------------------------------------------------------------
//DATEIEN WURDEN UMSORTIERT UMBENNENEN DER SPALTEN ANHAND FOLGENDER REIHENFOLGE
    console.log(parsedData[0]) 
      
//UMBENNENEN VON SPALTEN FALLS ANDERE NAMEN FÜR SLOT TYPEN VERWENDET WERDEN SOLLEN!
    var nameArray = ['Name','Type', 'Name', 'userId (S)',  'TransportDemandsId (N)','demandReason (S)','diameter (S)', 'machines (S)','manufactureStep (S)']; //Hier bitte die Namen der SlotTypes eintragen die Umbenannt werden sollen in der Form ['Name', 'xxx']
    var renameArray=['TypesOfTools','Storages', 'TypesOfHandle', 'userId','TransportDemandsId', 'demandReason','diameter', 'machines','manufactureStep'];// Hier bitte die neuen Namen der SlotTypes in entsprechender Reihenfolge eintragen
        for (let i=0; i < nameArray.length; i++){
            var index = parsedData[0].indexOf(nameArray[i]);
            var newHeader = parsedData[0];
            delete newHeader[index];
                   newHeader[index] = renameArray[i];
                   newHeader = parsedData[0];
        }
//-----------------------------------------------------------------------------------              
//LÖSCHEN VON SLOT TYPEN DIE NICHT KONVERTIERT WERDEN SOLLEN! 
//OPTION 1: LÖSCHT NUR EINEN SLOT TYP NACH DEM NAMEN (NUR ERSTEN SLOT TYP IN DER REIHENFOLGE)
    var deleteValues = ['typesOfTools (S)'];  // Hier werden Spaltennamen angegeben die gelöscht werden sollen
    const position = [];
        for (let i=0; i < deleteValues.length; i++){
          var idx = parsedData[0].indexOf(deleteValues[i]);
          position.push(idx);
        }
//OPTION 2: LÖSCHT ALLE ANGEGEBENEN SLOT TYPEN MIT DEM GLEICHEN NAMEN
    var deleteAllValues = ['CreatedBy','EditedBy','EditDate', 'CreatedDate',   'timeStart (S)']; // Hier werden alle Spaltennamen angegeben die gelöscht werden sollen
        for (let i=0; i < deleteAllValues.length; i++){
           var idx = parsedData[0].indexOf(deleteAllValues[i])
          while (idx != -1){
            position.push(idx);
            idx =  parsedData[0].indexOf(deleteAllValues[i], idx + 1);
          }
    }
    //Position Array muss absteigend sortiert werden damit richtiges Element gelöscht wird in der Index sich nicht verändert.
    position.sort(function(a,b){return b - a});
    //zur sicherheit noch -1 löschen falls jemand Werte löschen möchte die es gar nicht gibt!
    for (let i=0; i < position.length; i++){
        if (position.includes(-1)) { 
          position.pop()
        }
    } 
    //löschen der Werte in den jeweiligen Arrays!
    for (let j=0; j < parsedData.length; j++){
        for (let i=0; i< position.length; i++){
        parsedData[j].splice(position[i],1);
        }
    }

//Arrays in Spalten konvertieren 
  const header = parsedData.shift();// get the first row as header and delete header
  const numberOfColumns = header.length;
  const columnData = [...Array(numberOfColumns)].map(item => new Array());

    for(var i=0; i<parsedData.length; i++) {
      var rowData = parsedData[i];
      for(var j=0; j<numberOfColumns; j++) {
        columnData[j].push(rowData[j]);
      }
    }

//--------------------------------------------------------------------------------------
// OPTIONAL: ARRAYS MIT ZAHLEN WERDNE HIER AUF DREI WERTE BEGRENZT! (SINNVOLL BEI IDS)
//Wenn für Zahlen Arrays nur ein bis drei Beispielwerte gegeben werden sollen!
    for (let i=0; i < columnData.length; i++){
        const newColumnData = [];
        var equalColumn = columnData[i];
        
        if (typeof equalColumn[0] === 'number') {
          for(let j=0; j < 3; j++){
            newColumnData.push(equalColumn[j])
          }
          columnData[i] = newColumnData 
        }
        //Wenn für Datum Arrays nur drei Beispielwerte gegeben werden sollen! Hier evtl noch Verbesserungsbedaf!
        if (typeof equalColumn[0] === 'Date') {
            for(let j=0; j < 3; j++){
              newColumnData.push(equalColumn[j])
            }
            columnData[i] = newColumnData 
          }       
    }
    
//doppelte Werte des Arrays löschen
const deleteIndex = [];
  for(let x=0; x<header.length; x++){
      var uniqueArray = [... new Set(columnData[x])];
        //undefined werte die durch die zusammenführung entstanten sind werden entfernt
        if (uniqueArray.includes(undefined)){
            uniqueArray.pop();
        }

//---------------------------------------------------------------------------------
//OPTIONAL: SLOT TYPES KOMPLETT LÖSCHEN DIE NUR NULL ENTHALTEN PART 1
      if (uniqueArray.length === 1 && uniqueArray[0] === 'NULL') {
        uniqueArray.shift();
        deleteIndex.push(x)
      }  
//--------------------------------------------------------------------------------

//zuerst wirs überprüft ob es Synonyme gibt 
//Eindeutige Werte in Array mit entsprechendem JSON Schema speichern
     const arrayObjects = [];
     const synonymIndex =[];
     const arrayIndexSynonyms =[];
          for(let j=0; j<Synonyms.length; j++){
            for(let i=0; i<Synonyms[j].length; i++){
                if(uniqueArray.includes(Synonyms[j][i])){
                  synonymIndex.push(uniqueArray.indexOf(Synonyms[j][i]))
                  arrayIndexSynonyms.push(Synonyms[j])
                }  
              } 
            }
            
            for(let v=0; v<uniqueArray.length; v++){
              const obj = new Object ();
              obj.value = uniqueArray[v];
                 for (let u = 0; u < synonymIndex.length; u++){
                    if (v === synonymIndex[u] ){
                        obj.synonyms = arrayIndexSynonyms[u];
                      } 
                  }
              arrayObjects.push({"name": obj});
            }            
      // Globales Array in dem die Arrays mit den Objekten gespeichert ist und nacheinander ausgelesen werden kann
      arrayValues.push(arrayObjects)  
  }

//----------------------------------------------------------------------------------------------------
//OPTIONAL: SLOT TYPES KOMPLETT LÖSCHEN DIE NUR NULL ENTHALTEN PART 2  
    deleteIndex.sort(function(a,b){return b - a});
      for(let i=0; i<deleteIndex.length; i++){
        header.splice(deleteIndex[i],1);
        arrayValues.splice(deleteIndex[i],1);
      }
//-----------------------------------------------------------------------------------------------------

// Wichtig hier gloable Arrays! hier werden die Header mit dem Objekt array in das entgültige JSON Schema geschrieben      
  for(let u=0; u<header.length; u++){
    types.push({ "name": header[u],"values": arrayValues[u]})
  }
  console.log(header)
        
var jsonArray = JSON.stringify(types, null, 4) //wandelt Array in JSON um
                     
// SCHREIBT DAS JSON SCHEMA IN EINE JSON DATEI
fs.writeFile('result.json', jsonArray, (err) => {  //Dateiname für die Ergebnisse auswählen
    if (err) {
        throw err;
    }
    console.log("JSON array is saved.");
}); 