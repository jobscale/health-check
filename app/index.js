import net from 'net';
import { logger } from '@jobscale/logger';

const conf = {
  webList: [
    'https://jsx.jp',
    'https://cdn.jsx.jp',
    'https://www.jsx.jp',
    'https://site.cdn.jsx.jp',
  ],
  tcpList: [
    'noble.jsx.jp:3128',
    'jp.jsx.jp:443',
  ],
  slack: 'https://jsx.jp/api/slack',
};

const template = {
  channel: 'infra',
  icon_emoji: ':mobile_phone_off:',
  username: 'Unhealthy',
  text: '',
  attachments: [{
    fallback: '',
  }],
};

class App {
  async healthTcp(target, timeout = 2000) {
    const [host, portStr] = target.split(':');
    const port = Number.parseInt(portStr, 10);
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        logger.info(`✅ Connected to ${host}:${port}`);
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        logger.error(`⏱️ Timeout after ${timeout}ms`);
        socket.destroy();
        const error = [target, 'Timeout', `${timeout}ms`];
        reject(new Error(error.join(' ')));
      });
      socket.on('error', e => {
        logger.error(`❌ Connection error: ${e.message}`);
        const error = [target];
        if (e.cause) error.push(e.cause);
        error.push(e.message);
        reject(new Error(error.join(' ')));
      });
      socket.connect(port, host);
    });
  }

  async healthWeb(target) {
    const ts = Date.now();
    return this.fetch(target)
    .then(res => {
      if (!res.ok) throw new Error(res.statusText);
      if (res.status !== 200) throw new Error(res.statusText);
      logger.info(`Healthy ${target} ${res.statusText} ${Date.now() - ts}(ms)`);
    })
    .catch(e => {
      const error = [target];
      if (e.cause) error.push(e.cause);
      error.push(e.message);
      error.push(`${Date.now() - ts}(ms)`);
      logger.info(`Unhealthy ${error.join(' ')}`);
      throw new Error(error.join(' '));
    });
  }

  async checkHealth() {
    const results = await Promise.allSettled([
      ...conf.webList.map(target => this.healthWeb(target)),
      ...conf.tcpList.map(target => this.healthTcp(target)),
    ]);
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
