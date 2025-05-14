import dotenv from 'dotenv';
import d from './plugins/Pandora/src/Pandora.js';

const Api = d.default; // wtf

dotenv.config();
const a = new Api(process.env.USERNAME, process.env.PASS);
console.log(await a.login());
console.log(await a.stationList());
