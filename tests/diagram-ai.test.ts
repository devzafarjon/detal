import assert from 'node:assert/strict';
import {validateScan,normalizeScan} from '../lib/diagram-ai';
const tiles=Array.from({length:5},()=>({image:'data:image/jpeg;base64,/9j/AA==',rect:[100,200,400,600]}));
validateScan({size:[1000,1200],tiles,modelName:'Test model'});
assert.throws(()=>validateScan({size:[1000,1200],tiles:[{image:'https://bad.invalid/a',rect:[0,0,10,10]}]}));
const p={id:12,tile:1,x:500,y:250,name:'Motor',originalName:'电机',article:'',confidence:'medium'};
const result=normalizeScan({parts:[p,p],warnings:['Tekshiring']},tiles);
assert.equal(result.parts.length,1);assert.equal(result.parts[0].x,300);assert.equal(result.parts[0].y,350);assert.equal(result.parts[0].price,null);assert.equal(result.parts[0].needsReview,true);assert.equal(result.parts[0].aiConfidence,'low');
assert.throws(()=>normalizeScan({parts:[{...p,x:1001}]},tiles));assert.throws(()=>normalizeScan({parts:[{...p,tile:0}]},tiles));assert.throws(()=>normalizeScan({parts:[{...p,id:-1}]},tiles));
console.log('PASS: crop-to-sheet mapping, duplicate review, invalid input/output, no invented prices');

const claimed={...p,nameBasis:'web',nameSource:'https://example.com/parts',nameEvidence:'Matching drawing'};
assert.equal(normalizeScan({parts:[claimed]},tiles).parts[0].nameStatus,'visual');
assert.equal(normalizeScan({parts:[claimed]},tiles,['https://example.com/parts']).parts[0].nameStatus,'web_catalog');
assert.equal(normalizeScan({parts:[{...claimed,nameSource:'javascript:alert(1)'}]},tiles,['javascript:alert(1)']).parts[0].nameSource,'');
console.log('PASS: uncited web claims downgraded and unsafe links rejected');
