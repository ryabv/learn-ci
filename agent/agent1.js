const express = require('express');
const path = require('path');
const request = require('request');
const bodyParser = require('body-parser');
const { serverPort } = require('./agent.config.json');
const { spawn } = require('child_process');
const agentPort = 2222;
const app = express();
app.listen(agentPort);
console.log(`Агент запущен на порту ${agentPort}`);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    next();
});


request(`http://localhost:${serverPort}/notify_agent?port=${agentPort}&host=localhost`, (err) => {
    if (err) throw new Error(`Ошибка соединения с сервером! ${err}`);
});


app.post('/build', (req, res) => {
    const buildId = req.body.buildId || 'не получен id';
    const commitHash = req.body.commitHash;
    const command = `&& ${req.body.command}` || '';
    const repository = req.body.repository;
    const start = new Date();

    let result = [];
    const commits = spawn(`cd ${repository} && git checkout ${commitHash} -q ${command}`, {
        shell: true
    });

    commits.stderr.on('data', data => {
        res.send(`STDERR: ${data.toString()}`);
    });

    commits.stdout.on('data', data => {
        data = data.toString();
        result.push(data);
    });

    commits.on('close', () => {
        const finish = new Date();
        request.post({
            url: `http://localhost:${serverPort}/notify_build_result`,
            form: {
                id: buildId,
                data: result,
                start,
                finish
            }
        }, (err) => {
            if (err) throw new Error(`Ошибка на агенте: ${err}`);
        });
        res.json({
            id: buildId,
            data: result,
            start,
            finish
        });
    });
});






function unsubscribe() {
    request(`http://localhost:${serverPort}/unsubscribe_agent?port=${agentPort}&host=localhost`, (err, response, body) => {
        if (err) {
            throw new Error(`Ошибка! ${err}`);
        } else {
            console.log(body);
        }
    });
}