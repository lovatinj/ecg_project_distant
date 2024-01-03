// Password : cCxn76eQdTVspIFt
// Login : jeremielovatin

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { parse, isWithinInterval } = require('date-fns');

const TWILIO_SID = "AC31b7550fdecf6b39ec4134f7ba223d7e"
const TWILIO_AUTH_TOEKN = "1743e3b5a2921b290be4e4d44335be79"

const twilio = require('twilio')(TWILIO_SID, TWILIO_AUTH_TOEKN)
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

function formattedDateForDB(){
  const originalDate = new Date();

  const year = originalDate.getFullYear();
  const month = String(originalDate.getMonth() + 1).padStart(2, '0');
  const day = String(originalDate.getDate()).padStart(2, '0');
  
  const formattedDate = `${day}-${month}-${year}`;
  return formattedDate
}

const uri = "mongodb+srv://lovatinj:mongodbpassword@ecgproject.f3jwuqt.mongodb.net/?retryWrites=true&w=majority";
const clientSQL = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await clientSQL.connect();
    await clientSQL.db("admin").command({ ping: 1 });
    console.log("Client connected to MongoDB");
  } catch(err) {
    console.err(err)
    await clientSQL.close();
  }
}

run().catch(console.dir);

const dbName = 'ecg';
const db = clientSQL.db(dbName);
const collectionHistory = db.collection('ecg_collection');
const collectionInformations = db.collection('ecg_informations');
var id_filter = "";
var bpm = 120;

function getAllDocument(startDate, endDate) {
  return collectionHistory.find(
      {"date": {
        $gte: startDate,
        $lte: endDate,
      }}).toArray()
    .then(allData => {
      //console.log('Found documents =>', allData);
      return allData;
    });
}

function getAllDocumentInformations() {
  return collectionInformations.find({}).toArray()
    .then(allData => {
      //console.log('Found documents =>', allData);
      return allData;
    });
}

async function insertDocument(data){
  const insertResult = await collectionHistory.insertMany([data]);
  console.log('Inserted documents =>', insertResult);
}

async function insertDocumentInformations(data){
  bpm = data.bpm;
  const insertResult = await collectionInformations.insertMany([data]);
  console.log('Inserted documents =>', insertResult);
}

async function updateDocumentInformations(data){
  bpm = data.bpm;
  const filter = { _id: new ObjectId(id_filter) };
  const update = {
    $set: {
      "bpm": data.bpm,
      "phone": data.phone,
      "email": data.email,
    }
  };

  collectionInformations.updateOne(filter, update);

}


// MQTT setup
var mqtt = require('mqtt');
var options = {
    port: 1883,
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    username: 'project-thibaut-jeremie@ttn',
    password: 'NNSXS.PXDPT7PXVKKE3SIN3DCIHGNEDH6LMCKLGIGGTLA.3DFWF2KBEAITEPPWQHWNHI4A24VMUL46MZHGSQ55RR5IBRMWOYPA',
    keepalive: 60,
    reconnectPeriod: 1000,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: true,
    encoding: 'utf8'
};
var client = mqtt.connect('https://eu1.cloud.thethings.network',options);

client.on('connect', function() {
  console.log('Client connected to TTN')
  client.subscribe('v3/project-thibaut-jeremie@ttn/devices/eui-jeremie-thibaut/up')
});

client.on('error', function(err) {
  console.log(err);
});

client.on('message', function(topic, message) {
  var getDataFromTTN = JSON.parse(message);
  if(bpm < getDataFromTTN.uplink_message.decoded_payload.hr){
    var getFrmPayload = getDataFromTTN.uplink_message.decoded_payload;
    getFrmPayload["date"] = formattedDateForDB();
    console.log(getFrmPayload)
  
    // Envoyé à la base Mongodb
  
    insertDocument(getFrmPayload);
  }else{
    console.log("Bpm correct")
  }
});

io.on('connection', (socket) => {

  //console.log("Vous avez dépassé le BPM maximum enregistré qui est de " + informationsJSON["bpm"] + ". Veuillez ignorer ce message si vous effectuez un effort physique.", formaterNumeroTelephone(informationsJSON["phone"]));

  socket.on("get:data", (heures) => {
    console.log(heures)

    getAllDocument(heures[0], heures[1])
    .then(documents => {
      socket.emit("post:historique", documents);

      // Do something
    })
    .catch(error => {
      console.error('Erreur lors de la récupération des documents :', error);
    });
  })

  socket.on("set:informations", (data) => {
    if(id_filter === ""){
      insertDocumentInformations(data)
    }else{
      updateDocumentInformations(data)
    }
  })

  socket.on("get:informations", () => {
    getAllDocumentInformations().then(documents => {
      if(documents.length > 0){
        id_filter = documents[0]._id
        bpm = documents[0].bpm
        socket.emit("send:informations", documents[0]);
      }else{
        console.log("Aucun document")
      }
    })
  })

});

// function formaterNumeroTelephone(numero) {
//   const numeroNettoye = numero.replace(/\D/g, '');
//   if (numeroNettoye.startsWith('0')) {
//       return `+33${numeroNettoye.substring(1)}`;
//   }
//   return `+${numeroNettoye}`;
// }

// async function sendSMS(msg, phone){
//   return twilio.messages.create({
//     body: msg,
//     from: "+18162988496",
//     to: phone
//   }).then(message => console.log(message)).catch(err => console.log(err))
// }

app.use(express.static(path.join(__dirname, 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

server.listen(3002, () => {
  console.log('Serveur en cours d\'écoute sur le port 3002');
});
