const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');

const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const NumObi = phoneNumberFormatter('529991739233');
const NumOz  = phoneNumberFormatter('529992612798');
//const NumFel = phoneNumberFormatter('529991739233');
//const NumSos = phoneNumberFormatter('529991739233');
//const NumHil = phoneNumberFormatter('529991739233');

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: true
}));

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ],
  },
  authStrategy: new LocalAuth()
});

client.on('message', msg => {

  let NumeroCliente = (msg.from).split("@");
  
  if (msg.body == msg.body) {

    if((msg.body).length >= 42) // cantidad de caracteres en TextoClave
    {

      let TextoClave = '¡Hola! está es la información de mi pedido';
      let Verificador = 1;

      for (let index = 0; index < TextoClave.length; index++)
      {
        if(TextoClave[index] != msg.body[index]){
          Verificador = 0;
        }
      }

      if(Verificador == 1){

        let EspaciosBody = (msg.body).split("\n");

        let NombreBody = EspaciosBody[4].split(":");
        let CelularBody = EspaciosBody[5].split(":");

        let NombreCliente = NombreBody[1];
        let Organizacion = 'Cerveza Lupnaticos';

        let Celular = CelularBody[1]; 
        let CelularFormat = '521' + Celular;
        let CelNumberFormatter = phoneNumberFormatter(CelularFormat);

        const messageVCard =
          'BEGIN:VCARD\n' +
          'VERSION:3.0\n' +
          `FN:${NombreCliente}\n` +
          `ORG:${Organizacion};\n` +
          `TEL;type=CELL;type=VOICE;waid=${CelNumberFormatter}:${CelNumberFormatter}\n` +
          'END:VCARD';

        const message = msg.body;
        const number = phoneNumberFormatter('5219991739233');

              client.sendMessage(number, message).then(response => {
                console.log('Se envio a ObiEuan');
              }).catch(err => {
                console.log('No se envio a ObiEuan');
              });

        console.log(msg);

        const message2 = msg.body;
        const numberOz = phoneNumberFormatter('529992612798'); 

              client.sendMessage(numberOz, message2).then(response => {
                console.log('Se envio a Oz');
              }).catch(err => {
                console.log('No se envio a Oz');
              });

        console.log(msg);

      }

    }else if((msg.body).length == 1)
    {

      switch (msg.body) {

        //No me han contestado
        case '1':
            msg.reply('Menú de opciones: \n3.- Reenviar pedido. \n4.- Contactar por correo');
          break;

          //Redes sociales
        case '2':
            msg.reply('Nuestras redes sociales son las siguientes: \n1.- Facebook: https://www.facebook.com/cervezaartesanalmerida \n2.- Instagram: https://www.instagram.com/cerveza.lupnaticos/');
          break;

          //Opción 1.1 - Enviar recordatorio a los vendedores.
        case '3':
            msg.reply('Se ha reenviado su pedido.');

            let NombreCliente = 'WhatsappBot';
            let Organizacion = 'Cerveza Lupnaticos';
            let Celular = NumeroCliente[0];

            const message =
              'BEGIN:VCARD\n' +
              'VERSION:3.0\n' +
              `FN:${NombreCliente}\n` +
              `ORG:${Organizacion};\n` +
              `TEL;type=CELL;type=VOICE;waid=${Celular}:${Celular}\n` +
              'END:VCARD';

              const number = phoneNumberFormatter('5219991739233');

              client.sendMessage(number, message).then(response => {
                console.log('Se envio a ObiEuan');
              }).catch(err => {
                console.log('No se envio a ObiEuan');
              });

          break;

          //Mostrar correo electronico de contacto.
        case '4':
            msg.reply('Puede contactarnos vía correo enviando un mensaje a mayanhops@gmail.com');
          break;

        default:
            msg.reply('Opción no valida en el menú, nuestro menú de opciones es el siguiente: \n1.- No me han contestado. \n2.- Redes Sociales.');
          break;
      }

    }else{
      msg.reply('Opción no valida en el menú, nuestro menú de opciones es el siguiente: \n1.- No me han contestado. \n2.- Redes Sociales.');
    }

  }

});

client.initialize();

// Socket IO
io.on('connection', function(socket) {
  socket.emit('message', 'Connecting...');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready!');
    socket.emit('message', 'Whatsapp is ready!');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'Whatsapp is authenticated!');
    socket.emit('message', 'Whatsapp is authenticated!');
    console.log('AUTHENTICATED');
  });

  client.on('auth_failure', function(session) {
    socket.emit('message', 'Auth failure, restarting...');
  });

  client.on('disconnected', (reason) => {
    socket.emit('message', 'Whatsapp is disconnected!');
    client.destroy();
    client.initialize();
  });
});


const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  client.sendMessage(number, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send media
app.post('/send-media', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  // const media = MessageMedia.fromFilePath('./image-example.png');
  // const file = req.files.file;
  // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

const findGroupByName = async function(name) {
  const group = await client.getChats().then(chats => {
    return chats.find(chat => 
      chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
}

// Send message to group
// You can use chatID or group name, yea!
app.post('/send-group-message', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const message = req.body.message;

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      return res.status(422).json({
        status: false,
        message: 'No group found with name: ' + groupName
      });
    }
    chatId = group.id._serialized;
  }

  client.sendMessage(chatId, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Clearing message on spesific chat
app.post('/clear-message', [
  body('number').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  const chat = await client.getChatById(number);
  
  chat.clearMessages().then(status => {
    res.status(200).json({
      status: true,
      response: status
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  })
});

server.listen(port, function() {
  console.log('App running on *: ' + port);
});
