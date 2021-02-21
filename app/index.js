const { logger } = require('core');

require('core');

global.logger = console;
const conf = {
  target: 'https://jsx.jp',
  cookie: 'X-AUTH=X0X0X0X0X0X0X0X',
  host: 'https://partner.credentials.svc.cluster.local',
};
if (process.env.NODE_ENV === 'LOCAL') {
  conf.host = 'https://jsx.jp:3443';
}
const template = {
  icon_emoji: ':badger:',
  username: 'Unhealthy',
  text: '',
  attachments: [{
    fallback: '',
  }],
};

class App {
  fetchEnv() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    const pattern = [/=/g, '', 'base64'];
    return fetch(`${conf.host}/env.json`, {
      method: 'GET',
      headers: { Cookie: conf.cookie },
    })
    .then(res => res.json())
    .then(res => JSON.parse(
      Buffer.from(res.env.replace(...pattern), pattern[2]).toString(),
    ).slack.access);
  }

  fetchIP() {
    return fetch('http://inet-ip.info/ip')
    .then(res => res.text())
    .then(res => res.split('\n')[0]);
  }

  checkHealth() {
    process.env.https_proxy = 'http://proxy.secure.jsx.jp:3128';
    return fetch(conf.target)
    .then(response => {
      if (!response.ok) throw new Error(response.statusText);
      if (response.status !== 200) throw new Error(response.statusText);
      logger.info(response.statusText);
    });
  }

  send(access, param) {
    const url = `https://hooks.slack.com/services/${access}`;
    const body = JSON.stringify(param, null, 2);
    const options = {
      method: 'POST',
      'Content-Type': 'application/json',
      body,
    };
    return fetch(url, options)
    .then(response => {
      if (!response.ok) throw new Error(response.statusText);
      return response.text();
    })
    .catch(e => e.toString());
  }

  getData() {
    return Promise.all([
      this.fetchIP(),
      this.fetchEnv(),
    ]);
  }

  main() {
    return this.getData()
    .then(([, access]) => this.checkHealth()
    .catch(e => {
      const param = {};
      Object.assign(param, template, {
        text: e.toString(),
      });
      return this.send(access, param);
    }));
  }

  start() {
    this.main()
    .catch(e => logger.error(e));
  }
}

new App().start();
