const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { serverPort, repository } = require('../server.config.json');

const app = express();
app.listen(serverPort);
console.log(`Сервер запущен на порту ${serverPort}`);

const agents = new Set();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    next();
});



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
});

// зарегистрировать агента, например, 
// http://localhost:8000/notify_agent?port=1234&host=localhost
app.get('/notify_agent', (req, res) => {
    const port = req.query.port || 'порт не задан';
    const host = req.query.host || 'хост не задан';
    agents.add(`${host}:${port}`);

    res.send(`notify_agent! port: ${port}, host: ${host}`);
});

// сохранить результаты сборки, например, 
// http://localhost:8000/notify_build_result?id=1&status=resolve&out=some-info
app.get('/notify_build_result', (req, res) => {
    const buildId = req.query.id || 'не получен id';
    const status = req.query.status || 'не получен статус';
    const stdout = req.query.out || 'нет данных';
    const stderr = req.query.err || 'нет ошибок';

    res.send(
        `notify_build_result! 
        buildId: ${buildId}, 
        status: ${status}, 
        stdout: ${stdout}, 
        stderr: ${stderr}`
    );
});