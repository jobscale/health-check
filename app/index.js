const { logger } = require('@jobscale/logger');
const { update } = require('./ddns');

const conf = {
  targets: [
    'https://jsx.jp',
    'https://www.jsx.jp',
    'https://site.jsx.jp',
    'https://site.cdn.jsx.jp',
  ],
  slack: 'https://jsx.jp/api/slack',
};
const template = {
  icon_emoji: ':mobile_phone_off:',
  username: 'Unhealthy',
  text: '',
  attachments: [{
    fallback: '',
  }],
};

class App {
  checkHealth() {
    return Promise.all(conf.targets.map(target => fetch(target)
    .then(res => {
      if (res.status !== 200) throw new Error(`Unhealthy ${res.statusText}`);
      logger.info({ [target]: `Healthy ${res.statusText}` });
    })));
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
      logger.info(res.statusText);
    });
  }

  main() {
    return update()
    .then(res => {
      logger.info('dns', res);
      return this.checkHealth();
    })
    .catch(e => {
      const payload = { ...template, text: e.toString() };
      return this.sendSlack(payload);
    });
  }

  start() {
    this.main()
    .catch(e => logger.error(e.message, e.response.data));
  }
}

new App().start();
