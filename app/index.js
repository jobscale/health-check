const { logger } = require('@jobscale/logger');

const conf = {
  targets: [
    'https://jsx.jp',
    'https://cdn.jsx.jp',
    'https://www.jsx.jp',
    'https://site.jsx.jp',
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
  async checkHealth() {
    const ts = Date.now();
    const results = await Promise.allSettled(
      conf.targets.map(
        target => this.fetch(target)
        .then(res => {
          if (res.status !== 200) throw new Error(res.statusText);
          logger.info(`Healthy ${target} ${res.statusText} ${Date.now() - ts}(ms)`);
        })
        .catch(e => {
          if (e.cause) e.message = `${e.cause} ${e.message}`;
          e.message = `${target} ${e.message}`;
          logger.info(`Unhealthy ${e.message} ${Date.now() - ts}(ms)`);
          throw e;
        }),
      ),
    );
    const error = [];
    results.forEach(result => {
      if (result.status === 'rejected') error.push(result.reason.message);
    });
    if (error.length) throw new Error(`Health check failed for the following targets:\n${error.join('\n')}`);
  }

  fetch(input, rest = {}) {
    const { timeout = 3000, ...init } = rest;
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
      const text = `${e.message}\n${e.stack.split('\n').splice(0, 3).join('\n')}`;
      const payload = { ...template, text };
      return this.sendSlack(payload);
    });
  }

  start() {
    this.main()
    .catch(e => logger.error(e.message, e.response.data));
  }
}

new App().start();
