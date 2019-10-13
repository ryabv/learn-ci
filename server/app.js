const express = require('express');
const path = require('path');
const fs = require('fs');
const request = require('request');
const bodyParser = require('body-parser');
const { serverPort, repository } = require('./server.config.json');

const app = express();
app.listen(serverPort);
console.log(`Сервер запущен на порту ${serverPort}`);

let agent = {};


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    next();
});


app.get('/build/:id', (req, res) => {
    fs.readFile('builds.json', function(err, content) {
        if (err) throw err;
        const builds = JSON.parse(content);
        const currBuild = builds.filter(build => { return build.id === req.params.id });

        if (!currBuild.length) {
            res.send('Build с таким id не найден')
        } else {
            res.send(currBuild);
        }

    });
});


app.get('/build', (req, res) => {
    const buildId = createUniqId();
    const commitHash = req.query.commitHash;
    const command = req.query.command;

    if (!agent.host || !agent.port) {
        res.status(404).send('Ни один агент не зарегистрирован');
    } else {
        request.post({
                url: `http://${agent.host}:${agent.port}/build`,
                form: { buildId, commitHash, command, repository }
            },
            (err) => {
                if (err) throw new Error(`Ошибка соединения с агентом: ${err}`);
            });

        fs.readFile('builds.json', function(err, content) {
            if (err) throw err;
            const parseJson = JSON.parse(content);
            parseJson.push({ id: buildId, status: 'PENDING' });

            fs.writeFile('builds.json', JSON.stringify(parseJson, null, 4), function(err) {
                if (err) throw err;
            })
        });

        res.redirect('/');
    }

});


// Получить список билдов (нужен для отрисовки на главной странице)
app.get('/builds', (req, res) => {
    const builds = fs.readFileSync('builds.json', 'utf8');
    res.json(builds);
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
});

// зарегистрировать агента, например, 
// http://localhost:8000/notify_agent?port=1234&host=localhost
app.get('/notify_agent', (req, res) => {
    const port = req.query.port || '';
    const host = req.query.host || '';
    agent = { host, port };

    if (!port || !host) throw new Error('не задан хост или порт агента');

    console.log(`Агент зарегистрирован на сервере! port: ${port}, host: ${host}.`);
    res.sendStatus(200);
});

// сохранить результаты сборки
app.post('/notify_build_result', (req, res) => {

    fs.readFile('builds.json', function(err, content) {
        if (err) throw err;
        let parseJson = JSON.parse(content);
        parseJson = parseJson.filter((build) => { return build.id !== req.body.id });
        parseJson.push(req.body);

        fs.writeFile('builds.json', JSON.stringify(parseJson, null, 4), function(err) {
            if (err) throw err;
        })
    });

    res.sendStatus(200);
});

function createUniqId() {
    return new Date().getTime().toString(32);
}