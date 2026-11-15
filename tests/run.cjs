const {spawn, spawnSync} = require('child_process');
const root = require('path').resolve(__dirname, '..');
(async () => {
    let server;
    try {
        let ready = false;
        try {
            ready = (await fetch('http://127.0.0.1:8765/app/index.html')).ok;
        } catch {}
        if (!ready) {
            server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], {cwd: root, stdio: 'ignore'});
            for (let i = 0; i < 50 && !ready; i++) {
                await new Promise(r => setTimeout(r, 100));
                try {
                    ready = (await fetch('http://127.0.0.1:8765/app/index.html')).ok;
                } catch {}
            }
        }
        if (!ready) throw Error('Local test server did not start');
        for (const test of [
            'classic',
            'shell',
            'native-auth',
            'startup',
            'features',
            'chat-presentation',
            'player-navigation',
            'multistream',
            'updates'
        ]) {
            const result = spawnSync(process.execPath, [`tests/${test}-browser.cjs`], {cwd: root, stdio: 'inherit', env: process.env});
            if (result.status !== 0) throw Error(test + ' failed');
        }
    } finally {
        if (server) server.kill();
    }
})().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
