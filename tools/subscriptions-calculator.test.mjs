import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subscriptions} from '../assets/budget-calculator/subscriptions-model.mjs';
test('monthly yearly weekly charges',()=>{assert.equal(subscriptions([{amount:'100',period:'month'},{amount:'1200',period:'year'},{amount:'10',period:'week'}]).annual,292000);});
test('selected reduction',()=>{const r=subscriptions([{amount:'499',period:'month',remove:true},{amount:'1200',period:'year'}]);assert.equal(r.removable,598800);assert.equal(r.remaining,120000);});
test('zero and decimal',()=>{assert.equal(subscriptions([{amount:'0',period:'month'}]).annual,0);assert.equal(subscriptions([{amount:'1,25',period:'week'}]).annual,6500);});
test('invalid values and limits',()=>{for(const rows of [[],[{amount:'-1',period:'month'}],[{amount:'5',period:'day'}],Array(31).fill({amount:'1',period:'month'})])assert.throws(()=>subscriptions(rows));});
test('reject inherited property names as payment periods',()=>{for(const period of ['constructor','toString','__proto__'])assert.throws(()=>subscriptions([{amount:'100',period}]));});
test('maximum supported total stays exact',()=>{const r=subscriptions(Array(30).fill({amount:'100000000',period:'week',remove:true}));assert.equal(r.annual,15600000000000);assert.equal(r.removable,r.annual);assert.equal(r.remaining,0);assert.ok(Number.isSafeInteger(r.annual));});
