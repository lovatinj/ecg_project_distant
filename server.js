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

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://lovatinj:mongodbpassword@ecgproject.f3jwuqt.mongodb.net/?retryWrites=true&w=majority";

function formattedDateForDB(){
  const originalDate = new Date();

  const year = originalDate.getFullYear();
  const month = String(originalDate.getMonth() + 1).padStart(2, '0');
  const day = String(originalDate.getDate()).padStart(2, '0');
  
  const formattedDate = `${day}/${month}/${year}`;
  return formattedDate
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
const collection = db.collection('ecg_collection');

function getAllDocument() {
  return collection.find({}).toArray()
    .then(allData => {
      //console.log('Found documents =>', allData);
      return allData;
    });
}

async function insertDocument(data){
  const insertResult = await collection.insertMany([data]);
  console.log('Inserted documents =>', insertResult);
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
  var getFrmPayload = getDataFromTTN.uplink_message.decoded_payload;
  getFrmPayload["date"] = formattedDateForDB();
  console.log(getFrmPayload)

  // Envoyé à la base Mongodb
  
  insertDocument(getFrmPayload);

});

io.on('connection', (socket) => {

  //console.log("Vous avez dépassé le BPM maximum enregistré qui est de " + informationsJSON["bpm"] + ". Veuillez ignorer ce message si vous effectuez un effort physique.", formaterNumeroTelephone(informationsJSON["phone"]));

  socket.on("get:data", (heures) => {
    console.log(heures)

    getAllDocument(heures[0], heures[1])
    .then(documents => {
      console.log(documents);

      const filteredData = documents.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= heures[0] && itemDate <= heures[1];
      });
  
      console.log('Résultats trouvés :', filteredData);

    })
    .catch(error => {
      console.error('Erreur lors de la récupération des documents :', error);
    });
  })

  // socket.on("set:information", data => {
  //   informationsJSON = data;
  //   fs.writeFile(fichierInformationsJSON, JSON.stringify(data, null, 2), 'utf8', (err) => {
  //     if (err) {
  //         console.error('Erreur lors de l\'écriture du fichier :', err);
  //         return;
  //     }
  //     console.log('Informations sauvegardées');
  //   });
  // })

  // socket.on("get:information", () => {
  //   fs.readFile(fichierInformationsJSON, 'utf8', (err, data) => {
  //     if (err) {
  //         console.error('Erreur lors de la lecture du fichier JSON :', err);
  //         return;
  //     }
  
  //     const jsonData = JSON.parse(data);
      
  //     socket.emit("post:information", jsonData);
  //   });
  // })

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
