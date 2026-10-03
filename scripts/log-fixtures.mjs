import fs from "node:fs";
import {fileURLToPath} from "node:url";
const out=fileURLToPath(new URL("../docs/fixtures/",import.meta.url));
function fmt(type,name,format,columns,length){const b=Buffer.alloc(89);b.set([0xa3,0x95,128,type,length]);b.write(name,5,4);b.write(format,9,16);b.write(columns,25,64);return b;}
function arm(t,state){const b=Buffer.alloc(12);b.set([0xa3,0x95,150]);b.writeBigUInt64LE(BigInt(t*1e6),3);b[11]=state;return b;}
const start=Date.parse("2026-10-01T08:00:00Z"),gps=start-315964800000+18000,week=Math.floor(gps/604800000),gms=gps%604800000;
function position(t,relative){const b=Buffer.alloc(30);b.set([0xa3,0x95,151]);b.writeBigUInt64LE(BigInt(t*1e6),3);b[11]=3;b.writeUInt32LE(gms+t*1000,12);b.writeUInt16LE(week,16);b.writeInt32LE(Math.round(18.52043*1e7),18);b.writeInt32LE(Math.round((73.856744+t*.000001)*1e7),22);b.writeFloatLE(550+relative,26);return b;}
function bat(t,v,i,mah,instance=0){const b=Buffer.alloc(24);b.set([0xa3,0x95,152]);b.writeBigUInt64LE(BigInt(t*1e6),3);b[11]=instance;b.writeFloatLE(v,12);b.writeFloatLE(i,16);b.writeFloatLE(mah,20);return b;}
const parts=[fmt(150,"ARM","QB","TimeUS,ArmState",12),fmt(151,"GPS","QBIHLLf","TimeUS,Status,GMS,GWk,Lat,Lng,Alt",30),fmt(152,"BAT","QBfff","TimeUS,Inst,Volt,Curr,CurrTot",24),position(0,0),arm(1,1)];
for(let t=1;t<=120;t++){parts.push(position(t,t<110?Math.min(98,t*2):Math.max(0,(120-t)*9)));parts.push(bat(t,t%2?25:24,t%2?10:50,(t-1)*100));parts.push(bat(t,48,20,(t-1)*50,1));}
parts.push(arm(121,0));fs.writeFileSync(out+"synthetic-flight.bin",Buffer.concat(parts));
// Independent fixed MAVLink v1 wire layout, checksums calculated with bitwise CRC.
function crc(bytes,extra){let crc=0xffff;for(const byte of Buffer.concat([bytes,Buffer.from([extra])])){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc&1)?(crc>>>1)^0x8408:crc>>>1;}return crc;}
let sequence=0;
function frame(id,extra,payload,t){const header=Buffer.from([payload.length,sequence++%256,1,1,id]);const body=Buffer.concat([header,payload]);const checksum=Buffer.alloc(2);checksum.writeUInt16LE(crc(body,extra));const timestamp=Buffer.alloc(8);timestamp.writeBigUInt64BE(BigInt((start+t*1000)*1000));return Buffer.concat([timestamp,Buffer.from([0xfe]),body,checksum]);}
function heartbeat(t,state){const b=Buffer.alloc(9);b.writeUInt32LE(0);b[4]=2;b[5]=3;b[6]=state?128:0;b[7]=4;b[8]=3;return frame(0,50,b,t);}
function global(t,relative){const b=Buffer.alloc(28);b.writeUInt32LE(t*1000,0);b.writeInt32LE(Math.round(18.52043*1e7),4);b.writeInt32LE(Math.round((73.856744+t*.000001)*1e7),8);b.writeInt32LE(Math.round((550+relative)*1000),12);b.writeInt32LE(relative*1000,16);return frame(33,104,b,t);}
function status(t){const b=Buffer.alloc(31);b.writeUInt16LE(24000,14);b.writeInt16LE(2000,16);return frame(1,124,b,t);}
const tlog=[heartbeat(0,false),heartbeat(1,true)];for(let t=1;t<=120;t++){tlog.push(global(t,t<110?Math.min(98,t*2):Math.max(0,(120-t)*9)),status(t));}tlog.push(heartbeat(121,false));
fs.writeFileSync(out+"synthetic-flight.tlog",Buffer.concat(tlog));
console.log("Synthetic .bin and timestamped MAVLink v1 .tlog fixtures created.");
