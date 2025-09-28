import net from 'net';
import { exec } from 'child_process';
import { createLogger } from '@jobscale/logger';

const logger = createLogger('info', { noPathName: true, timestamp: true });

const conf = {
  webList: [
    'https://jsx.jp',
    'https://cdn.jsx.jp',
    'https://www.jsx.jp',
    'https://site.cdn.jsx.jp',
  ],
  tcpList: [
    'us.jsx.jp:3128',
    'jp.jsx.jp:443',
    'n100.jsx.jp:3128',
    'www.jsx.jp:443',
  ],
  udpList: [
    'us.jsx.jp:53',
    'n100.jsx.jp:53',
    'jp.jsx.jp:53',
  ],
  slack: 'https://jsx.jp/api/slack',
};

const template = {
  channel: 'infra',
  icon_emoji: ':name_badge:',
  username: 'Unhealthy',
  text: '',
  attachments: [{
    fallback: '',
  }],
};

class App {
  async healthTcp(target, timeout = 3000) {
    const ts = Date.now();
    const [host, portStr] = target.split(':');
    const port = Number.parseInt(portStr, 10);
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        const info = ['✅ TCP Connected', target, `${Date.now() - ts}ms`];
        logger.info(info.join(' '));
        resolve(info.join(' '));
      });
      socket.on('timeout', () => {
        socket.destroy();
        const error = ['❌ TCP Timeout', target, 'after', `${Date.now() - ts}ms`];
        logger.error(error.join(' '));
        reject(new Error(error.join(' ')));
      });
      socket.on('error', e => {
        socket.destroy();
        const error = ['❌ TCP Fail', target];
        if (e.cause) error.push(e.cause);
        error.push(`${Date.now() - ts}ms`, e.message);
        logger.error(error.join(' '));
        reject(new Error(error.join(' ')));
      });
      socket.connect(port, host);
    });
  }

  healthUdp(target, timeout = 1000) {
    const ts = Date.now();
    const [host, portStr] = target.split(':');
    const port = Number.parseInt(portStr, 10);
    const recvLimit = Math.floor(timeout / 1000);
    return new Promise((resolve, reject) => {
      exec(`nc -vz -w ${recvLimit} -u ${host} ${port}`, (e, stdout, stderr) => {
        const ok = stderr.match('succeeded');
        if (e || !ok) {
          const error = ['❌ UDP Fail', target];
          if (e?.cause) error.push(e.cause);
          error.push(`${Date.now() - ts}ms`);
          if (stderr) error.push(stderr);
          logger.error(error.join(' '));
          reject(new Error(error.join(' ')));
          return;
        }
        const info = ['✅ UDP Open', target, `${Date.now() - ts}ms`];
        logger.info(info.join(' '));
        resolve(info.join(' '));
      });
    });
  }

  async healthWeb(target) {
    const ts = Date.now();
    return this.fetch(target)
    .then(res => {
      if (!res.ok) throw new Error(res.statusText);
      if (res.status !== 200) throw new Error(res.statusText);
      logger.info(`✅ Healthy ${target} ${res.statusText} ${Date.now() - ts}ms`);
    })
    .catch(e => {
      const error = ['❌ Unhealthy', target];
      if (e.cause) error.push(e.cause);
      error.push(e.message, `${Date.now() - ts}ms`);
      logger.error(error.join(' '));
      throw new Error(error.join(' '));
    });
  }

  async checkHealth() {
    const results = [];
    results.push(...await Promise.allSettled([
      ...conf.webList.map(target => this.healthWeb(target)),
    ]));
    results.push(...await Promise.allSettled([
      ...conf.tcpList.map(target => this.healthTcp(target)),
    ]));
    results.push(...await Promise.allSettled([
      ...conf.udpList.map(target => this.healthUdp(target)),
    ]));
    const error = results
    .filter(({ status }) => status === 'rejected')
    .map(({ reason }) => reason.message);
    if (error.length) throw new Error(error.join('\n'));
  }

  fetch(input, rest = {}) {
    const { timeout = 6000, ...init } = rest;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
  }

  sendSlack(payload) {
    const params = [
      conf.slack, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    ];
    return fetch(...params)
    .then(res => {
      if (res.status !== 200) throw new Error(res.statusText);
    });
  }

  main() {
    return this.checkHealth()
    .catch(e => {
      const payload = { ...template, text: e.message };
      return this.sendSlack(payload);
    });
  }

  start() {
    this.main()
    .catch(e => logger.error(e.message, e.response.data));
  }
}

new App().start();
