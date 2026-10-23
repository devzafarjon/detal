import test from 'node:test';
import assert from 'node:assert/strict';
import {demoPriceFor,fillMissingDemoPrices} from '../scripts/demo-price-rules.mjs';

test('demo prices are deterministic and category-sensitive',()=>{
 const screw={name:'Mahkamlash vinti',article:'M4'};
 assert.deepEqual(demoPriceFor(screw),demoPriceFor(screw));
 assert.ok(demoPriceFor({name:'LCD display assembly'}).price>demoPriceFor(screw).price);
});

test('fills only missing prices and marks each new amount as demo',()=>{
 const source={id:1,parts:[{id:1,name:'Front Housing Assembly',price:null,demoPrice:false},{id:2,name:'Rotor',price:450000,demoPrice:false},{id:3,name:'Sensor',demoPrice:false}]};
 const {model,added}=fillMissingDemoPrices(source,new Map([['1:1',230000]]));
 assert.equal(added,2);assert.equal(source.parts[0].price,null);
 assert.equal(model.parts[0].price,230000);assert.equal(model.parts[0].demoPrice,true);
 assert.equal(model.parts[1].price,450000);assert.equal(model.parts[1].demoPrice,false);
 assert.ok(model.parts[2].price>0);assert.equal(model.parts[2].demoPrice,true);
});
