const urls = ['https://f5.si/', 'https://v6.f5.si/'];
const f5Si = 'P2RvbWFpbj1qc3gmcGFzc3dvcmQ9MDAzNDJmYjVjMDY1Njg1MmM2YzM0OWJmYTM1ZWY3MWIK';
const token = str => Buffer.from(str, 'base64').toString();

const update = () => Promise.all(urls
.map(url => fetch(`${url}update.php${token(f5Si)}`)
.then(async res => `${url} ${await res.text()}`)
.catch(e => `${url} ${e.message}`)));

module.exports = {
  update,
};
