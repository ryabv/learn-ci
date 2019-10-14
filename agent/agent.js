const express = require('express');
const path = require('path');
const request = require('request');
const bodyParser = require('body-parser');
const { serverPort, agentPort } = require('./agent.config.json');
const { spawn } = require('child_process');
const app = express();
app.listen(agentPort);
console.log(`Агент запущен на порту ${agentPort}`);

process.on('SIGINT', () => {
    request(`http://localhost:${serverPort}/unsubscribe?port=${agentPort}&host=localhost`, () => {
        process.exit();
    });
});

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
    setTimeout(() => {
        const buildId = req.body.buildId || 'не получен id';
        const commitHash = req.body.commitHash;
        const command = `&& ${req.body.command}` || '';
        const repository = req.body.repository;
        const start = new Date();

        let result = [];
        let error = [];
        const commits = spawn(`cd ${repository} && git checkout ${commitHash} -q ${command}`, {
            shell: true
        });

        commits.stderr.on('data', data => {
            error.push(data.toString());
        });

        commits.stdout.on('data', data => {
            result.push(data.toString());
        });


        commits.on('close', () => {
            const finish = new Date();
            const status = error.length ? 'FAILED' : 'SUCCESS';
            request.post({
                url: `http://localhost:${serverPort}/notify_build_result?port=${agentPort}&host=localhost`,
                form: {
                    id: buildId,
                    status,
                    command: req.body.command,
                    stdout: result,
                    stderr: error,
                    start,
                    finish
                }
            }, (err) => {
                if (err) throw new Error(`Ошибка на агенте: ${err}`);
            });

            res.json({
                id: buildId,
                data: result,
                command,
                start,
                finish
            });
        });
    }, 0);

});