const express = require('express');
const path = require('path');
const fs = require('fs');
const request = require('request');
const bodyParser = require('body-parser');
const { serverPort, repository } = require('./server.config.json');

const app = express();
app.listen(serverPort);
console.log(`Сервер запущен на порту ${serverPort}`);

const agents = new Set();


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
    const agentsArray = Array.from(agents);
    const buildId = createUniqId();
    const commitHash = req.query.commitHash;
    const command = req.query.command;

    if (!agentsArray.length) {
        res.status(404).send('Ни один агент не зарегистрирован');
    } else {
        request.post({
                url: `http://localhost:${agentsArray[0].port}/build`,
                form: { buildId, commitHash, command, repository }
            },
            (err) => {
                if (err) throw new Error(`Ошибка соединения с агентом: ${err}`);
                res.sendStatus(200);
            });
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
    const agentInfo = { host, port };

    if (!port || !host) throw new Error('не задан хост или порт агента');

    agents.add(agentInfo);
    console.log(`Агент зарегистрирован на сервере! port: ${port}, host: ${host}. \n
    Список текущих агентов: ${getAgentsList()}`);
    res.sendStatus(200);
});

// отписать агента, например, 
// http://localhost:8000/unsubscribe_agent?port=1234&host=localhost
app.get('/unsubscribe_agent', (req, res) => {
    const port = req.query.port || 'порт не задан';
    const host = req.query.host || 'хост не задан';
    agents.delete(`${host}:${port}`);
    console.log(`Агент ${host}:${port} удалён с сервера`)
    console.log(agents.size ? getAgentsList() : 'Список агентов пуст');
    res.send(`Агент удалён с сервера!`);
});

// сохранить результаты сборки
app.post('/notify_build_result', (req, res) => {

    fs.readFile('builds.json', function(err, content) {
        if (err) throw err;
        const parseJson = JSON.parse(content);
        parseJson.push(req.body);

        fs.writeFile('builds.json', JSON.stringify(parseJson, null, 4), function(err) {
            if (err) throw err;
        })
    });

    res.sendStatus(200);
});


function getAgentsList() {
    let agentsList = [];
    for (agent of agents) agentsList.push(`${agent.host}${agent.port}`);
    return agentsList.join('\n');
}

function createUniqId() {
    return new Date().getTime().toString(32);
}