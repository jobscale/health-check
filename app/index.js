const axios = require('axios');
const { logger } = require('@jobscale/logger');

const conf = {
  target: 'https://jsx.jp',
  slack: 'https://tanpo.jsx.jp/api/slack',
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
    return axios(conf.target)
    .then(res => {
      if (res.status !== 200) throw new Error(res.statusText);
      logger.info(res.statusText);
    });
  }

  sendSlack(payload) {
    const params = [
      conf.slack, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(payload),
      },
    ];
    return axios(...params)
    .then(res => {
      if (res.status !== 200) throw new Error(res.statusText);
      logger.info(res.statusText);
    });
  }

  main() {
    return this.checkHealth()
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
