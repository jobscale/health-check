require('@jobscale/core');

const conf = {
  target: 'https://jsx.jp',
  slack: 'https://tanpo.jsx.jp/api/slack',
  proxy: 'tcp://proxy.secure.jsx.jp:3128',
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
    process.env.https_proxy = conf.proxy;
    return fetch(conf.target)
    .then(res => {
      if (!res.ok) throw new Error(res.statusText);
      if (res.status !== 200) throw new Error(res.statusText);
      logger.info(res.statusText);
    });
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
      if (!res.ok) throw new Error(res.statusText);
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
    .catch(e => logger.error(e));
  }
}

new App().start();
