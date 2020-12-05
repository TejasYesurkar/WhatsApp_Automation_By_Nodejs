const { Client,MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const socketIo = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io =socketIo(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/',(req,res)=>{
    res.sendFile('index.html',{root: __dirname});
});

//Send Message
app.get('/send-message',(req, res)=>{
    const number = req.query.number;
    const message = req.query.message;
    client.sendMessage(number, message).then(response =>{
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err =>{
        res.status(500).json({
            status: false,
            response: err
        });
    });
});



//Send Message
app.get('/send-filePath',(req, res)=>{
    const number = req.query.number;
    const caption = req.query.message;
    let filePath=req.query.fileName;
    const media = MessageMedia.fromFilePath(filePath)
    client.sendMessage(number,media, caption).then(response =>{
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err =>{
        res.status(500).json({
            status: false,
            response: err
        });
    });
});



app.get('/send-media', async (req,res)=>{
    
    var number = req.query.number;
    var caption =req.query.message;
    let fileUrl=req.query.fileName;
    let mimetype="application/pdf";
    // let fileUrl="https://image.shutterstock.com/image-photo/bright-spring-view-cameo-island-260nw-1048185397.jpg";
    const attachment = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    }).then(response => {
      mimetype = "application/pdf";//response.headers['content-type'];
      return response.data.toString('base64');
    });
  
    const media = new MessageMedia("application/pdf", attachment, 'Media');
  
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
        response: "Error"
      });
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
    session: sessionCfg
  });


client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});
 

 
client.on('message', msg => {
    if (msg.body == 'hi') {
        msg.reply('Hello');
    }
});
 
client.initialize();

io.on('connection',function(socket){
    socket.emit('message','Connecting...');
    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url)=>{
            socket.emit('qr',url);
            socket.emit('message','QR Code recived, scan please!');
        });
    });

    client.on('ready', () => {
        socket.emit('message','WhatsApp Ready!');
    });
});

// //Send Message
// app.post('/send-message',(req, res)=>{
//     const number = req.query.number;
//     const message = req.query.message;
//     client.sendMessage(number, message).then(response =>{
//         res.status(200).json({
//             status: true,
//             response: response
//         });
//     }).catch(err =>{
//         res.status(500).json({
//             status: false,
//             response: err
//         });
//     });
// });

server.listen(8000, function(){
    console.log('App running on *' + 8000);
});